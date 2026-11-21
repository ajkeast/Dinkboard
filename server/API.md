# Dinkboard API Contract

Base URL (dev): `http://localhost:5000` by default (`PORT` env). On macOS, AirPlay Receiver
often binds 5000 — if so, set `PORT=5001` in `server/.env` and point
`VITE_API_BASE_URL` at that port.

## Conventions

- **Success responses:** bare JSON payloads (arrays/objects) exactly as listed below. No wrapper.
- **Error responses (all failures):**

  ```json
  { "error": { "code": "SOME_CODE", "message": "human readable", "details": [/* optional */] } }
  ```

  Codes: `UNAUTHORIZED` (401), `VALIDATION_ERROR` (400, `details` = `[{path, message}]`),
  `INVALID_CREDENTIALS` (401), `NO_REFRESH_TOKEN` / `INVALID_REFRESH_TOKEN` (401),
  `EMAIL_TAKEN` / `USERNAME_TAKEN` (409), `RATE_LIMITED` (429), `NOT_FOUND` (404),
  `DB_UNAVAILABLE` (503), `INTERNAL_ERROR` (500).
- **Auth:** httpOnly cookies. `access_token` (JWT, 15 min, path `/`) and `refresh_token`
  (opaque, 30 days, path `/api/auth`, rotated on every refresh). Browser clients must use
  `credentials: 'include'`; no tokens ever appear in JSON bodies. `Authorization: Bearer <jwt>`
  is accepted as a fallback (for tests/curl).
- **CORS:** origins from `CORS_ORIGIN` env (default `http://localhost:3000`,
  `http://localhost:5173`), `credentials: true`.
- **Rate limits:** login+register share 10 req / 15 min / IP (429 after). Global: 300 req/min/IP.
- Discord ids (members, messages, firsts user_id) are **strings** (64-bit snowflakes).

## Auth endpoints (public unless noted)

| Method | Path | Body | Success |
|---|---|---|---|
| POST | `/api/auth/register` | `{email, username (3-50, [a-zA-Z0-9_.-]), password (>=10)}` | 201 `{user}` + cookies set |
| POST | `/api/auth/login` | `{email, password}` | 200 `{user}` + cookies set |
| POST | `/api/auth/refresh` | — (uses refresh cookie) | 200 `{user}` + rotated cookies |
| POST | `/api/auth/logout` | — | 200 `{success:true}` + cookies cleared, refresh token revoked |
| GET | `/api/auth/me` | — (requires auth) | 200 `{user}` |
| GET | `/api/auth/discord` | — | 302 → Discord authorize (sets CSRF state cookie) |
| GET | `/api/auth/discord/callback` | — (query: `code`, `state`) | 302 → `{CLIENT_URL}/dashboard` + cookies, or `/login?error=discord_auth_failed` |

`user` = `{id:number, email, username, role:'admin'|'viewer', member_id:string|null, avatar_url:string|null}`

### Discord OAuth

Requires `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, and
`CLIENT_URL`. Scopes: `identify email`. On first login the server creates an `app_users`
row (passwordless) with `member_id` = Discord snowflake; if Discord’s email already
matches an existing account, that row is linked instead. OAuth-only users cannot use
password login.

## Public

- `GET /api/health` → `{status:'ok', db:'up'}` (200) or `{status:'degraded', db:'down'}` (503)

## Protected data endpoints (401 without valid access token)

All success shapes unchanged from the legacy API except `/api/ai/stats` (now an object) and
`/api/ai/*/timeline` (now returns real non-zero counts; hourly is sparse).

### /api/messages

- `GET /api/messages` → array (100 newest): `{id:string, user_name, channel_name:'#name', content, edited:boolean, edited_at, created_at, last_updated}`
  - `content` is the text currently shown in Discord: `COALESCE(edited_content, content)`. Rows that were never edited (`edited_content` NULL, including historical rows) return the stored original.
  - `edited` is true when `edited_content` is not null. `edited_at` is when that column was last written, or null.
- `GET /api/messages/members` → `[{user_id:string, user_name, messages:number}]`
- `GET /api/messages/channels` → `[{channel_name, messages:number}]`
- `GET /api/messages/channels/member?memberId=` → `[{channel_name, messages:number}]` (desc)
- `GET /api/messages/day?memberId=&startDate=&endDate=` → sparse `[{date:'YYYY-MM-DD', messages:number}]`
  (`startDate`/`endDate` optional together; default = last 365 days inclusive)
- `GET /api/messages/summary/member?memberId=` → `{total_messages, active_days, first_message_date, last_message_date}`
- `GET /api/messages/month` → `[{month:'Jan 2024', messages:number}]`
- `GET /api/messages/month/member` → last 12 months only: `[{month:'Jan 2024', <user_name>: count, ...}]`
- `GET /api/messages/stats` → **1-element array** `[{thisMTD, lastMTD, thisYTD, lastYTD}]`
  (intentionally still array-shaped until the M7 frontend cleanup)
- `GET /api/messages/:id` (`^\d{1,20}$`) → same object as one `/api/messages` row, or `null` if not found

### /api/members

- `GET /api/members` → `[{id:string, user_name, display_name, avatar, created_at, last_updated}]`
- `GET /api/members/:id` (`^\d{1,20}$`) → single member object, or `null`
- `GET /api/members/:id/minecraft` → `{linked:false}` when `minecraft.player_links` has no row for this Discord id (also when the minecraft schema has not been applied yet). When linked:

  ```json
  {
    "linked": true,
    "player": { "uuid": "…", "name": "…" },
    "skinUrl": "https://textures.minecraft.net/texture/…" ,
    "windowNote": "…",
    "windows": {
      "latestPlayday": "2026-11-20",
      "day": { "from": "2026-11-20", "to": "2026-11-20" },
      "week": { "from": "2026-11-14", "to": "2026-11-20" },
      "month": { "from": "2026-10-22", "to": "2026-11-20" }
    },
    "stats": { "day": {}, "week": {}, "month": {}, "all": {} },
    "advancements": [{ "id": "minecraft:story/mine_stone", "name": "Stone Age", "earnedAt": "…" }]
  }
  ```

  Each stats object: `playtimeTicks`, `playtimeSeconds` (vanilla `minecraft:play_time` / 20, includes idle), `activeSeconds` (sum of `public.minecraft_sessions.duration_seconds` where `likely_afk` is false; null if that bot table is absent), `deaths` (snapshot or daily delta minus `rolled_back` deaths), `jumps`, `blocksMined`, `blocksPlaced` (`minecraft:used` for block items), `mobKills`, `playerKills`, `distanceCm` (sum of `*_one_cm`), `itemsCrafted`, `diamondsMined` (diamond ore + deepslate diamond ore), `villagerTrades`, `animalsBred`, `fishCaught`, `damageDealt`, `damageTaken` (raw stat, tenths of a health point; 20 = 1 heart), `topMinedBlock`, `topKillerMob` (`{id, name, count}` or null).

  **Windows.** A playday is 05:00–05:00 America/New_York, labeled by the morning it starts (same window as the collector and as the bot's `activity_date`). Daily is the latest `playday` in `minecraft.daily_stats`. Weekly is that day and the 6 before it. Monthly is that day and the 29 before it. All-time is the latest `stats_snapshots` row, not the sum of daily deltas (deltas start 2026-11-20). All-time active time only covers days the bot has stored.

  This response never includes IP addresses, geolocation, chat, commands, or rejected logins. `skinUrl` is omitted (`null`) when Mojang's session server does not answer; tests skip the lookup.

- `GET /api/members/:id/minecraft/logins` — **admin only** (`app_users.role = 'admin'`). 401 logged out, 403 for viewers, 404 when the member has no Minecraft link. Aggregates `minecraft.logins` + `minecraft.ip_geo` by IP:

  `{ player: {uuid, name}, logins: [{ ip, country, region, city, isp, org, asn, mobile, proxy, hosting, count, firstSeen, lastSeen, flags: string[] }] }`

  Chat, commands, and rejected logins are not included.

  Admins are the existing `app_users.role` values (`admin` | `viewer`, default `viewer`). An admin promotes accounts on the Users page (`PATCH /api/users/:id/role`). The first admin is set in SQL: `UPDATE app_users SET role = 'admin' WHERE email = '…'`. Sign in again so the access token picks up the role. The login table is shown on that member's Minecraft section.

### /api/emojis

- `GET /api/emojis` → `[{id, emoji_name, url, created_at, last_updated, occurrences:number}]`
  Counts use the current message text (`COALESCE(edited_content, content)`), so an edit that adds or removes a custom emoji is reflected.
- `GET /api/emojis/count` → `[{emoji_name, occurences:number}]` (sic, legacy field spelling). Same current-text match as `/api/emojis`.
- `GET /api/emojis/:id` (numeric) → single emoji row, or `null`

### /api/firsts

- `GET /api/firsts` → `[{user_id:string, user_name, timesent}]` (newest first)
- `GET /api/firsts/score` → `[{user_id:string, user_name, firsts:number, days_since_first:number}]`
- `GET /api/firsts/cumcount` → `[{name, data:[{timesent:unixSeconds, cum_count}]}]`
- `GET /api/firsts/juice` → `[{user_id:string, user_name, original_timestamp, eastern_timestamp, juice:number}]` (ascending by eastern_timestamp)
- `GET /api/firsts/juice/members` → `[{user_id:string, total_juice:number}]`
- `GET /api/firsts/limit/:limit` (1-500) → same shape as `/api/firsts`, limited
- `GET /api/firsts/:id` (`^\d{1,20}$`) → single row or `null`

### /api/ai

- `GET /api/ai/stats` → **object** `{chatgpt_today, dalle_today, chatgpt_last_30_days, dalle_last_30_days, chatgpt_prev_30_days, dalle_prev_30_days, total_tokens_last_30_days:string|null, total_tokens_prev_30_days:string|null}`
- `GET /api/ai/chatgpt/users?startDate&endDate` (ISO dates, both-or-neither) → `[{user_name, display_name, total_calls, total_input_tokens, total_output_tokens, total_tokens, days_used}]`
- `GET /api/ai/chatgpt/models` → `[{model, total_calls, total_input_tokens, total_output_tokens, total_tokens, avg_tokens_per_call}]`
- `GET /api/ai/chatgpt/timeline?groupBy=day|hour|month` (default day) → `[{time_period, total_calls, total_input_tokens, total_output_tokens, total_tokens}]`
  - day/month: contiguous zero-filled series; hour: sparse (only hours with activity)
  - SUM columns may come back as strings (Postgres NUMERIC); COUNT columns as numbers
- `GET /api/ai/chatgpt/recent?limit=1-500` (default 50) → recent log rows joined with user_name
- `GET /api/ai/dalle/users?startDate&endDate` → `[{user_name, display_name, total_prompts, days_used}]`
- `GET /api/ai/dalle/timeline?groupBy=day|hour|month` → `[{time_period, total_prompts}]`
- `GET /api/ai/dalle/recent?limit=1-500` → recent prompt rows joined with user_name

### /api/dinkcoin

Read-only views over Discord-bot tables `dinkcoin_balances` / `dinkcoin_transactions`.
`tx_type` is `mint` (new coins; `from_user_id` null) or `transfer` (peer trade).

- `GET /api/dinkcoin/balances` → `[{user_id:string, balance:string, user_name, display_name, avatar}]` (highest balance first)
- `GET /api/dinkcoin/transactions?limit=1-500` (default 100) → newest first:
  `{id, from_user_id, to_user_id, amount:string, tx_type:'mint'|'transfer', tx_hash, created_at, from_user_name, from_display_name, from_avatar, to_user_name, to_display_name, to_avatar}`

## Env vars (server/.env — names only)

`SQL_HOST` (may include `:port`), `SQL_USER`, `SQL_PASSWORD`, `SQL_DATABASE`, `PORT`,
`JWT_SECRET`, `CORS_ORIGIN` (comma-separated). Discord OAuth: `DISCORD_CLIENT_ID`,
`DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `CLIENT_URL`. Optional:
`ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`, `AUTH_RATE_LIMIT`, `API_RATE_LIMIT`,
`NODE_ENV` (`production` makes cookies `Secure`). See `server/.env.example`.

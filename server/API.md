# Dinkboard API Contract (post-M3)

Base URL (dev): `http://localhost:5001` (port from `PORT` env; code default 5000, but macOS
AirPlay squats 5000 on this machine, so `.env` sets 5001).

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
| GET | `/api/auth/discord/callback` | — (query: `code`, `state`) | 302 → `{CLIENT_URL}/#/dashboard` + cookies, or `/#/login?error=discord_auth_failed` |

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

- `GET /api/messages` → array (100 newest): `{id:string, user_name, channel_name:'#name', content, created_at, last_updated}`
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
- `GET /api/messages/:id` (`^\d{1,20}$`) → single message object, or `null` if not found

### /api/members

- `GET /api/members` → `[{id:string, user_name, display_name, avatar, created_at, last_updated}]`
- `GET /api/members/:id` (`^\d{1,20}$`) → single member object, or `null`

### /api/emojis

- `GET /api/emojis` → `[{id, emoji_name, url, created_at, last_updated, occurrences:number}]`
- `GET /api/emojis/count` → `[{emoji_name, occurences:number}]` (sic, legacy field spelling)
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
  - SUM columns come back as strings (MySQL DECIMAL); COUNT columns as numbers
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

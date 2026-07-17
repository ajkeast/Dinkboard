# Dinkboard Modernization Plan

Phase 1 deliverable (audit + baseline verified). This plan sequences Phases 2–5 into
milestones with concrete file-level changes, acceptance criteria, and suggested owners.

## Ground rules (apply to every milestone)

- **Never destructive SQL** against the live remote MySQL DB (`customer_230948_discordbot`).
  Schema **additions only**: new tables, new indexes on new tables. No `ALTER`/`DROP`/`TRUNCATE`
  on existing tables. In particular `firstlist_id` (927 rows) has **no primary key** — do not
  add one; any code that needs row identity must key on `(user_id, timesent)` or read-only usage.
- **Never commit secrets.** `server/.env` stays gitignored (verify), add `.env.example` files
  with placeholder values only.
- Existing tables and approximate sizes, for reference when writing queries/tests:
  `messages` (~272k, FKs → members, channels), `members` (37, `id varchar(20)` Discord snowflakes),
  `channels` (27), `emojis` (52), `firstlist_id` (927, no PK), `chatgpt_logs` (649, FKs →
  members/messages), `dalle_3_prompts` (325), `dinkcoin_balances` (6), `dinkcoin_transactions` (20).
- Mixed charsets exist in the DB (latin1 + utf8mb4). **All new tables: `utf8mb4` /
  `utf8mb4_unicode_ci`, InnoDB.**
- Discord IDs are 64-bit snowflakes stored as `varchar(20)` — keep them strings end-to-end;
  never parse to JS `Number`.

## Parallelization map

```
M1 (backend fixes)  ──► M2 (migrations+auth) ──► M3 (protect routes) ──► M6 (frontend auth) ──► M7 (UI overhaul) ──► M8 (visual QA) ──► M9/M10 (hardening)
M4 (Vite migration) ─── independent, can run in parallel with M1–M3
M5 (UI system decision) ─ after M4, parallel with M2/M3
```

- **Parallel track A (backend worker):** M1 → M2 → M3.
- **Parallel track B (frontend worker):** M4 → M5. M6 (login pages / auth wiring) blocks on M3.
- **Strictly sequential:** M6 → M7 → M8. M9/M10 after M8 (M9 API tests can start after M3).

---

## Phase 2 — Backend

### M1: Correctness & safety fixes (backend worker) — no schema changes

Small, independently verifiable fixes. Do these first; everything later builds on a working server.

**File-level changes**

1. `server/index.js`
   - `const PORT = Number(process.env.PORT) || 5000;` — resolves the 5001-vs-5000 mismatch in
     favor of **5000** (matches Dockerfile `EXPOSE 5000`, compose mapping `5000:5000`, README).
     Set `PORT=5000` in `.env.example`.
   - Remove duplicate body parsing (`body-parser` package) — keep `express.json()` +
     `express.urlencoded()`; drop `body-parser` from `server/package.json`.
2. `server/models/database.js` — **replace the 2-minute pool refresh**:
   - Delete the `setInterval` refresh, `isConnecting` busy-wait recursion, and retry-once logic.
   - Parse `SQL_HOST` defensively: `const [host, port] = (process.env.SQL_HOST ?? '').split(':')`
     and pass `{ host, port: port ? Number(port) : 3306 }`. This makes the current `.env`
     (whose value ends in `:3306`) work **without editing the user's .env**.
   - Single `mysql.createPool({ ..., enableKeepAlive: true, keepAliveInitialDelay: 10000,
     maxIdle: 4, idleTimeout: 60000, connectionLimit: 10, timezone: 'Z' })`. The keepalive +
     idle-recycling settings address the shared-host idle-disconnect problem the old refresh
     hack was working around.
3. `server/models/model.ai.js` — **fix SQL injection**: `generateDateSeries` interpolates
   `interval` into SQL, fed from `req.query.groupBy`. Whitelist:
   `const ALLOWED = { day: 'DAY', hour: 'HOUR', month: 'MONTH' }` and reject/400 anything else
   (validate in controller too, see M3 validation). Same for the `timeFormat` switch (already safe,
   but make the whitelist shared).
4. `server/routes/firstsRoutes.js` — **fix route shadowing**: move `router.get("/juice", ...)` and
   `router.get("/juice/members", ...)` **above** `router.get("/:id", ...)`.
5. `server/controllers/aiController.js` + `server/models/model.ai.js` — **AI stats shape bug**:
   `getAIUsageStats` returns `result[0]` (object), not the 1-row array. Coordinate with frontend
   (AI scene currently reads `aiStats?.chatgpt_today`; after this fix it works as written).
   Do the same for `messages/stats` (`getStats` → `result[0]`) and update `StatBox` consumers in M7
   (until then keep `messages/stats` as-is to avoid breaking the current dashboard; flag with TODO).
6. `server/models/model.messages.js` — replace suspect `CAST(messages.id AS VARCHAR(20))` with
   `CAST(messages.id AS CHAR(20))` (verify `/api/messages` actually returns 200 after; it was
   never runtime-verified).
7. `server/package.json` — remove `mongoose` (never imported), move `nodemon` to devDependencies.
8. Delete dead+broken model methods (`searchEmojis`, `searchMembers`, `getFirstsByDateRange`,
   `getMessagesByDateRange`, `createEmoji`, `updateEmoji`, `createMember`, `updateMember`,
   `createMessage`, `updateMessage`, `createFirst`, `getUserStats`, `getEmojiUsage`,
   `getTopEmojis`, `getFew` if unused) — or keep only ones with a caller. Fewer stringly-typed
   query-builder paths = smaller attack/bug surface.
9. Strip per-request `console.log` noise from `aiController.js`.

**Acceptance criteria**

- Server boots on `PORT` from env (default 5000) with the **unmodified** user `.env`.
- `GET /api/firsts/juice` returns the juice array (non-empty, sorted by timestamp).
- `GET /api/ai/chatgpt/timeline?groupBy=day|hour|month` works; `?groupBy=DAY);DROP` → 400.
- `GET /api/messages` and `/api/messages/:id` return 200 with rows.
- `GET /api/ai/stats` returns a JSON **object**.
- No `Proactively refreshing connection pool` logs; server survives >10 min idle then serves a
  query without error (keepalive verified).

### M2: Migrations system + users table + auth core (backend worker)

**Decision: plain SQL migration files with a tiny runner (recommended over Knex).**
Justification: the app uses raw SQL everywhere (no query-builder appetite), the DB is a live
remote instance where we want every statement reviewable as literal SQL, and additions-only policy
makes rollback machinery mostly moot. Use `mysql2` + a ~60-line runner rather than adopting Knex's
config/CLI surface for one table.

**File-level changes**

1. New `server/migrations/` directory:
   - `server/migrations/0001_create_users.sql`:
     ```sql
     CREATE TABLE IF NOT EXISTS app_users (
       id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       email         VARCHAR(255) NOT NULL UNIQUE,
       username      VARCHAR(50)  NOT NULL UNIQUE,
       password_hash VARCHAR(255) NOT NULL,
       member_id     VARCHAR(20)  NULL,  -- optional link to Discord members.id (no FK across charsets)
       role          ENUM('admin','viewer') NOT NULL DEFAULT 'viewer',
       created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
     ```
     Named `app_users` to avoid colliding with anything the Discord bot owns. **No FK constraint**
     to `members` (mixed charsets make cross-table FKs brittle); enforce linkage in app code.
   - `server/migrations/0002_create_refresh_tokens.sql`: `app_refresh_tokens`
     (`id`, `user_id` FK→`app_users.id`, `token_hash` (sha256), `expires_at`, `revoked_at`,
     `created_at`, index on `token_hash`). utf8mb4, InnoDB.
   - `server/migrations/migrate.js`: runner that creates `app_schema_migrations` (`filename`,
     `applied_at`) if absent, applies pending `.sql` files in order inside per-file transactions
     where possible, and **refuses to run any file containing `DROP|TRUNCATE|ALTER TABLE
     (messages|members|channels|emojis|firstlist_id|chatgpt_logs|dalle_3_prompts|dinkcoin_)` —
     a belt-and-braces guard for the additions-only rule.
   - `server/package.json`: `"migrate": "node migrations/migrate.js"`.
2. Auth implementation (new files):
   - `server/models/model.users.js` — `findByEmail`, `findById`, `createUser` (parameterized SQL,
     not the BaseModel builder).
   - `server/services/authService.js` — **argon2id** for password hashing (`argon2` package;
     preferred over bcrypt: memory-hard, no 72-byte truncation footgun) + JWT signing.
     Access token: 15 min, `HS256`, secret `JWT_SECRET`. Refresh token: random 256-bit value,
     stored hashed in `app_refresh_tokens`, 30-day expiry, rotated on every refresh.
   - `server/controllers/authController.js` — `register`, `login`, `logout`, `refresh`, `me`.
   - `server/routes/authRoutes.js` — `POST /api/auth/register`, `POST /api/auth/login`,
     `POST /api/auth/logout`, `POST /api/auth/refresh`, `GET /api/auth/me`.
   - Cookies: both tokens as **httpOnly, SameSite=Lax, Secure in production** cookies
     (`access_token`, `refresh_token`); `cookie-parser` middleware. No tokens in JSON bodies or
     localStorage.
   - New deps: `argon2`, `jsonwebtoken`, `cookie-parser`.
3. `.env` additions (document in `server/.env.example`, never commit real values):
   `PORT`, `JWT_SECRET`, `CORS_ORIGIN`, existing `SQL_*` keys with placeholders.

**Acceptance criteria**

- `npm run migrate` on the live DB creates only `app_schema_migrations`, `app_users`,
  `app_refresh_tokens`; re-running is a no-op. Existing tables untouched (verify via
  `SHOW TABLES` diff + row counts).
- Register → login → `GET /api/auth/me` → refresh → logout flow works via curl with a cookie jar.
- Passwords stored as argon2id hashes; refresh tokens stored only as hashes.
- Login sets httpOnly cookies; JS-readable cookies contain no tokens.

### M3: Middleware hardening — protect routes, validation, errors, CORS, rate limiting (backend worker)

**File-level changes**

1. `server/middleware/auth.js` — verifies the `access_token` cookie (or `Authorization: Bearer`
   fallback for tests), attaches `req.user`, 401 with the standard envelope on failure.
2. `server/index.js` — apply `requireAuth` to **all five data routers**
   (`/api/firsts`, `/api/emojis`, `/api/members`, `/api/messages`, `/api/ai`); `/api/auth/*`
   and a new `GET /api/health` (returns `{status:'ok'}` + DB ping) stay public.
3. **Validation — decision: `zod`** (over express-validator). Justification: single schema object
   per route, reusable types if the codebase ever goes TS, composable coercion (`z.coerce.number()`)
   for the string-heavy query params here.
   - `server/middleware/validate.js` — `validate({ params, query, body })` helper → 400 envelope
     with issue list.
   - Schemas: `:id` params (snowflake pattern `^\d{1,20}$` for members/messages; numeric for
     emojis), `limit` (int 1–500), `groupBy` (`enum ['day','hour','month']`),
     `startDate`/`endDate` (ISO date, both-or-neither), auth bodies (email, username 3–50,
     password ≥ 10 chars).
4. `server/middleware/errorHandler.js` + `server/utils/asyncHandler.js`:
   - Envelope everywhere: `{ "error": { "code": "...", "message": "..." } }` for failures; data
     endpoints keep returning bare JSON payloads on success.
   - Replace every controller try/catch (all of them currently return **404** for DB failures)
     with `asyncHandler`; central handler maps `DatabaseError` → 503, zod → 400, JWT → 401,
     unknown → 500. `morgan` stays; drop remaining `console.log`s.
5. CORS: `cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000', 'http://localhost:5173'], credentials: true })` —
   `credentials: true` is required for cookie auth; wide-open `cors()` removed.
6. Rate limiting: `express-rate-limit` — `/api/auth/login` + `/api/auth/register`: 10/15 min per
   IP; global API limiter 300/min as a backstop.
7. `helmet()` kept as-is.

**Acceptance criteria**

- Every `/api/*` data endpoint returns 401 (envelope JSON) without a valid cookie; 200 with one.
- `GET /api/members/abc!` → 400 with zod issues; `?groupBy=week` → 400.
- DB-down failure returns 503 `{error:{code:'DB_UNAVAILABLE',...}}` — not 404.
- 11th login attempt in 15 min → 429.
- Browser fetch from `http://localhost:5173` with `credentials:'include'` succeeds; from an
  unlisted origin fails CORS.

---

## Phase 3 — Frontend

### M4: CRA → Vite migration (frontend worker) — parallel with M1–M3

Feasibility already confirmed by audit: one env var, no service worker, no proxy, no ejected config.

**File-level changes**

1. `client/package.json` — remove `react-scripts`, `mysql2`, `dotenv`, `web-vitals`,
   `@testing-library/*` (reintroduced properly in M10), `concurrently`, `nodemon`; add `vite`,
   `@vitejs/plugin-react`. Scripts: `dev`, `build`, `preview`.
2. `client/vite.config.js` — `@vitejs/plugin-react`, `resolve.alias` mapping bare `src` roots
   (`components`, `scenes`, `state`, `theme`) or a single `src` alias to preserve the jsconfig
   `baseUrl:"src"` absolute imports; `server.port: 5173` (Vite default; stop squatting CRA's 3000).
3. `client/index.html` — move from `public/` to `client/` root; drop `%PUBLIC_URL%`
   (plain `/mascot.ico` etc.); real title ("Dinkboard"); add `<script type="module" src="/src/index.jsx">`.
4. Renames: `src/index.js` → `src/index.jsx`, `src/App.js` → `src/App.jsx` (JSX in `.js` breaks
   Vite's default loader). Remove the leftover tutorial comment at the top of `App.jsx`.
5. `src/components/FlexBetween.jsx` — convert `require()` → `import` (CJS breaks in Vite).
6. Env: `client/.env.example` with `VITE_API_BASE_URL=http://localhost:5000/`;
   `src/state/api.js` uses `import.meta.env.VITE_API_BASE_URL`. This also retires the broken
   committed `client/.env` (which pointed the API at the client itself); delete it from git and
   gitignore it.
7. Keep `HashRouter` for now (BrowserRouter switch is an M7 decision item tied to nginx config).

**Acceptance criteria**

- `npm run dev` serves on 5173 in seconds; all 7 scenes render identically to CRA baseline.
- `npm run build` outputs `dist/` with no errors; `npm run preview` serves it.
- No `process.env` references remain in `client/src`; `grep -r react-scripts client/` → nothing.

### M5: UI system decision + foundation (frontend worker)

**Recommendation: keep MUI v5. Do not replace it.** Justification: every scene and component is
built on MUI primitives + the theme's custom palette keys; MUI X Data Grid (FirstTable,
EmojisDataGrid) has no drop-in equivalent in Tailwind/shadcn land without rewriting table UX;
Recharts stays regardless (it's renderer-agnostic). Swapping UI kits would consume the entire
frontend budget on churn instead of visible improvement. Instead: refactor the theme.

- Drop `@nivo/*` (declared, never imported — dead weight in the bundle) and `react-datepicker`
  (unused).
- `theme.js`: keep token approach, but register custom keys via module augmentation-style
  documented conventions; fix light-mode contrast bugs; move repeated card `sx` blobs
  (identical shadow/hover copy-pasted across Dashboard/scenes) into a shared `DashCard`
  styled component (generalize `DinkCard.jsx`).

**Acceptance criteria:** single source of card styling; light mode passes a manual contrast pass;
bundle has no nivo chunks.

### M6: Auth UI + wiring (frontend worker) — **blocks on M3**

**File-level changes**

1. `src/state/api.js` — `fetchBaseQuery({ baseUrl, credentials: 'include' })`; wrap with
   `baseQueryWithReauth` that, on 401, calls `POST /api/auth/refresh` once and retries, else
   dispatches `loggedOut`.
2. New `src/state/authSlice.js` — `{ user, status }`; actions `setCredentials`, `loggedOut`;
   hydrate on app start via `GET /api/auth/me`. No token storage anywhere in JS (httpOnly cookies).
3. New endpoints in the api slice: `login`, `register`, `logout`, `me` (mutations/queries with
   `invalidatesTags`).
4. New scenes: `src/scenes/login/index.jsx`, `src/scenes/register/index.jsx` — MUI forms,
   client-side validation mirroring the zod rules, error envelope display.
5. `src/App.jsx` — `RequireAuth` wrapper around the `Layout` route group; `/login`, `/register`
   public; redirect logic both directions.
6. `Sidebar.jsx` — remove dead nav items (Admin, Donations) or route them; fix "API Usage" →
   `/ai` mismatch; add user chip + logout button (Navbar).

**Acceptance criteria:** unauthenticated visit to any scene redirects to `/login`; login lands on
`/dashboard` with data; refresh-token rotation transparent (leave tab >15 min, next click still
works); logout clears session and guards re-engage.

### M7: UI overhaul (frontend worker, after M6)

- Layout/spacing/typography pass on all 7 scenes: consistent page gutters (`Header` + content grid),
  Inter loaded via `@fontsource/inter` (currently referenced but never loaded), type ramp check.
- Replace `MessagesBarChart` hardcoded member dataKeys with keys derived from the response.
- Fix Dashboard's empty emoji card: implement the emoji pie/top-N list using `/api/emojis`
  (or delete the card).
- Loading skeletons: reuse `StatBox`'s Skeleton pattern for every chart/table (replace the bare
  "Loading..." text in 6 components).
- Empty + error states: shared `<QueryState>` wrapper rendering skeleton / error (with retry) /
  empty-message around every RTK Query consumer.
- Stats shape cleanup: consume object-shaped `/api/messages/stats` (flip the M1 TODO), remove
  `StatBox`'s `data[0]` indexing and dead `increase` prop.
- Responsiveness: the 12-col grid collapses at 1400px only; add proper sm/md breakpoints;
  sidebar becomes temporary drawer on mobile.
- Dark/light: audit every hardcoded `rgba(78, 0, 204, ...)` shadow and `theme.palette.white`
  usage in light mode.
- Delete dead code: `ChannelsPieChart.jsx`, unused AI-scene imports (`useGetRecentChatGPTQuery`,
  `useGetRecentDalleQuery` — or build the "recent" panels), unused imports across scenes.

**Acceptance criteria:** no bare "Loading..." text anywhere; every scene handles error + empty;
all scenes usable at 375px, 768px, 1440px; both themes visually coherent.

---

## Phase 4 — Visual QA

### M8: Playwright screenshot loop (visual-QA worker, after M7)

- New `e2e/` (repo root): Playwright with a logged-in storage state fixture (register/login a
  QA user against the dev server).
- Screenshot matrix: 7 scenes × 2 widths (1440×900, 375×812) × 2 themes = 28 shots per cycle;
  script writes to `e2e/screenshots/<scene>-<width>-<theme>.png`.
- Iterative loop: run → review shots → file/fix layout issues (frontend worker) → rerun.
  Exit when a full pass produces no P1/P2 visual defects.
- Add non-visual smoke assertions while there: each scene renders ≥1 chart/table with data,
  no console errors.

**Acceptance criteria:** clean 28-shot matrix committed for review; zero console errors on any
scene; documented list of accepted minor quirks.

## Phase 5 — Hardening

### M9: API integration tests (backend worker; can start right after M3)

- `server/tests/` with `vitest` + `supertest`.
- Auth suite: register/login/refresh/logout happy paths; wrong password; expired access token +
  refresh; revoked refresh token; rate-limit 429.
- Data suite (against live DB, **read-only**): 401 unauthenticated on every router; 200 + shape
  assertions for `/api/messages/stats`, `/api/firsts/score`, `/api/firsts/juice`,
  `/api/ai/stats`, `/api/ai/chatgpt/timeline?groupBy=month`; 400 for bad `groupBy`/`:id`.
- Test DB writes limited to `app_users`/`app_refresh_tokens` rows created and deleted by the
  suite itself.

### M10: Frontend auth-flow tests, Docker, docs (frontend + backend workers)

- 3–4 Playwright auth-flow tests in `e2e/`: redirect-when-logged-out, login success, bad
  credentials error, logout.
- `docker-compose.yml`: server port 5000 aligned (after M1), pass `SQL_*`/`JWT_SECRET`/
  `CORS_ORIGIN` via `env_file`, remove Mongo comment cruft; client image gets an
  `nginx.conf` (required if BrowserRouter adopted; also proxy `/api` → server).
- `server/Dockerfile`: `npm ci --omit=dev`; `client/Dockerfile`: Vite build output `dist/`
  instead of `build/`, node 20.
- `README.md` rewrite: real stack (MySQL not Mongo), real env vars (`SQL_*`), real ports,
  migrate/setup instructions, screenshots from M8.
- `.env.example` in `server/` and `client/`; CI-check or grep-hook that `.env` never appears
  in `git status` (already gitignored — verify both dirs; root `.gitignore` too).
- Root `package.json`: fix `file:` self-dependencies; scripts for `dev` (both), `migrate`, `test`.

**Acceptance criteria (M9+M10):** test suites green locally; `docker compose up` serves client
on :80 and API on :5000 with working auth against the remote DB; fresh-clone setup from README
works using only `.env.example` guidance.

---

## Known environment gotchas (carried from Phase 1)

- The repo lives in an **iCloud-synced folder**: node startup, npm installs, and CRA compiles are
  extremely slow (CRA took >10 min). Vite (M4) mitigates; consider relocating the repo for dev.
- `server/.env` `SQL_HOST` value ends in `:3306`; M1's host:port parsing makes this valid —
  do not edit the user's `.env`.
- The remote MySQL is a live shared host that kills idle connections; keepalive pool settings
  (M1) replace the old 2-minute pool-recreate hack. Verify after >10 min idle.
- `emojis` occurrence queries `LOCATE` over ~272k `messages` rows — acceptable today, but M9
  should record response times; add `LIMIT`/caching only if measured slow.

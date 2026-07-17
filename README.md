# Dinkboard

Discord analytics dashboard for a private community: **Express + MySQL** API, **React (Vite) + MUI + Recharts** client, httpOnly cookie auth (JWT access + rotating refresh).

> Not a MongoDB/MERN stack despite the repo folder name — the database is MySQL.

## Stack

| Layer | Tech |
|---|---|
| Client | React 18, Vite, MUI 5, Recharts, Redux Toolkit / RTK Query, React Router (`HashRouter`) |
| API | Node.js, Express, mysql2, argon2, JWT, zod, helmet, express-rate-limit |
| Auth | `access_token` + `refresh_token` httpOnly cookies (Bearer fallback for curl/tests) |
| DB | MySQL (shared Discord data tables + `app_users` / `app_refresh_tokens`) |

## Prerequisites

- Node.js 20+ (18 may work; Docker images use 20)
- npm 9+
- Network access to the MySQL host configured in `server/.env`

## Quick start

```bash
git clone <repo-url>
cd MERN-Dashboard

# Install
npm run install:all

# Configure env (never commit real .env files)
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit server/.env: SQL_*, JWT_SECRET, PORT, CORS_ORIGIN
# Edit client/.env: VITE_API_BASE_URL (match server PORT)

# Create auth tables (safe — only creates app_* tables)
npm run migrate

# Dev (API + Vite client in parallel)
npm run dev
```

- Client: http://localhost:3000  
- API: http://localhost:5000 (or **5001** — see Ports below)

## Ports

| Service | Default | Notes |
|---|---|---|
| Vite client | `3000` | `client/vite.config.js` |
| Express API | `5000` | `PORT` in `server/.env`; code default 5000 |
| Docker client | `80` | nginx |
| Docker API | `5000` | mapped to host |

**macOS AirPlay quirk:** AirPlay Receiver often binds **TCP 5000**. If the API fails to listen or you see unexpected responses on 5000, set `PORT=5001` in `server/.env` and `VITE_API_BASE_URL=http://localhost:5001/` in `client/.env`. See `server/API.md`.

## Environment variables

### `server/.env` (names only — copy from `.env.example`)

| Variable | Purpose |
|---|---|
| `SQL_HOST` | MySQL host; may include `:port` (e.g. `db.example.com:3306`) |
| `SQL_USER` / `SQL_PASSWORD` / `SQL_DATABASE` | Credentials |
| `PORT` | API listen port (5000 default; 5001 if AirPlay conflict) |
| `JWT_SECRET` | HS256 secret for access tokens |
| `CORS_ORIGIN` | Comma-separated browser origins (include `http://localhost:3000`) |
| `COOKIE_SECURE` | Optional `true`/`false`; defaults to secure cookies when `NODE_ENV=production` |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Discord OAuth app credentials (see below) |
| `DISCORD_REDIRECT_URI` | Must match a redirect in the Discord portal, e.g. `http://localhost:5001/api/auth/discord/callback` |
| `CLIENT_URL` | SPA origin for post-OAuth redirects, e.g. `http://localhost:3000` |
| `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`, `AUTH_RATE_LIMIT`, `API_RATE_LIMIT` | Optional tuning |

### Discord OAuth setup

1. Create an application at [Discord Developer Portal](https://discord.com/developers/applications) → **OAuth2**.
2. Copy **Client ID** and **Client Secret** into `server/.env`.
3. Add a redirect URI that **exactly** matches `DISCORD_REDIRECT_URI` (include the API port).
4. Set `CLIENT_URL` to your Vite origin (`http://localhost:3000`). After login the API redirects to `{CLIENT_URL}/#/dashboard`.
5. Ensure `CLIENT_URL` is listed in `CORS_ORIGIN`.

### `client/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API base including trailing slash, e.g. `http://localhost:5001/`. Leave empty for same-origin `/api` (Docker nginx proxy). |

## Scripts

From repo root:

```bash
npm run install:all   # client + server deps
npm run dev           # API (nodemon) + Vite concurrently
npm run migrate       # apply server/migrations/*.sql
npm test              # server API integration tests (vitest)
npm run test:e2e      # Playwright auth-flow smoke (needs API up)
```

Server package:

```bash
cd server && npm test          # vitest + supertest
cd server && npm run migrate
cd server && npm run dev
```

E2E:

```bash
cd e2e && npm install && npx playwright install chromium
# API must already be running (npm run start:server / PORT from .env)
cd e2e && npm test
```

## Tests

### API integration (`server/tests`)

- Auth: register / login / logout / refresh / me, validation, bad password, expired access + refresh, revoked refresh, rate-limit 429
- Data (read-only Discord tables): 401 without auth; 200 shape checks for `/api/messages/stats`, `/api/members`, `/api/firsts/score`, `/api/firsts/juice`, `/api/ai/stats`, timeline; 400 for bad `groupBy` / `:id`
- Writes only to `app_users` / `app_refresh_tokens` (prefixed `m9test_*`), cleaned up after each suite

Requires a working `server/.env` pointed at MySQL.

### Playwright auth smoke (`e2e/`)

- Redirect when logged out
- Bad credentials error
- Login success → dashboard
- Logout → login + guard re-engages

Set `E2E_API_URL` if the API is not on `http://localhost:5001`.

## Docker

```bash
# server/.env must exist (compose uses env_file)
docker compose up --build
```

- App: http://localhost (nginx serves Vite `dist/`, proxies `/api` → `server:5000`)
- API also exposed on http://localhost:5000
- `COOKIE_SECURE=false` is set for local HTTP compose; set `true` behind HTTPS

### Production (VPS)

```bash
# On the server (also used by GitHub Actions):
/opt/apps/dinkboard/deploy/deploy.sh
```

- `docker-compose.prod.yml` — app behind shared Caddy (`/opt/infra/caddy`)
- `server/.env` lives only on the VPS (never committed)
- Live site: https://dinkscord.com

## CI / CD (GitHub Actions)

| Workflow | When | What |
|---|---|---|
| **CI** | Every PR + push to `main` | Client production build; server migrations + vitest (needs DB secrets) |
| **Deploy** | After CI succeeds on `main`, or manual **Run workflow** | SSH into VPS → `git pull` → `docker compose up --build` → migrate → health check |

### Required repository secrets

Settings → Secrets and variables → Actions:

| Secret | Purpose |
|---|---|
| `SQL_HOST` / `SQL_USER` / `SQL_PASSWORD` / `SQL_DATABASE` | MySQL for CI tests (same DB the app uses; tests only write `m9test_*` users) |
| `JWT_SECRET` | Any long random string for CI auth tests |
| `VPS_HOST` | VPS IP (e.g. `135.148.86.171`) |
| `VPS_USER` | SSH user (`root`) |
| `VPS_SSH_KEY` | Private key for a deploy-only SSH key authorized on the VPS |

Also create a GitHub **Environment** named `production` (Settings → Environments) so Deploy can use it.

## Project layout

```
├── client/                 # Vite React app
├── server/                 # Express API
│   ├── migrations/         # app_users, app_refresh_tokens
│   ├── tests/              # vitest + supertest
│   └── API.md              # response contract
├── e2e/                    # Playwright auth smoke
├── deploy/
│   ├── caddy/              # Shared reverse proxy (multi-domain)
│   └── deploy.sh           # Production deploy script (VPS)
├── docker-compose.yml      # Local compose
├── docker-compose.prod.yml # VPS compose (behind Caddy)
├── .github/workflows/      # CI + Deploy
└── PLAN.md
```

## Auth notes

- No tokens in JSON bodies or `localStorage` — cookies only (`credentials: 'include'`).
- Access JWT ~15m; refresh opaque token ~30d, path `/api/auth`, rotated on every refresh.
- Rate limits: 10 login/register attempts / 15 min / IP; 300 API req / min / IP.
- Optional Discord OAuth: `GET /api/auth/discord` → Discord → callback sets cookies and redirects to the SPA. First login auto-creates a passwordless account (or links by email); Discord snowflake is stored in `member_id`.

Full endpoint shapes: [`server/API.md`](server/API.md).

## License

ISC

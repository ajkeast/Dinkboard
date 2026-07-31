# GitHub Actions secrets after Postgres cutover

CI now uses a workflow `services:` Postgres (`pgvector/pgvector`) with in-job env.
**Delete these obsolete repo secrets** (they previously pointed at remote MySQL):

- `SQL_HOST`
- `SQL_USER`
- `SQL_PASSWORD`
- `SQL_DATABASE`

Keep unchanged:

- `JWT_SECRET`
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- Discord OAuth secrets if present

Local / VPS still use `SQL_*` in `server/.env` pointing at the local Postgres container (`SQL_HOST=postgres`).

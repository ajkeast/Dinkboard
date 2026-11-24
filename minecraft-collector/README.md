# Minecraft collector

Tails a Paper server's logs and stats files and writes them into the Dinkboard
Postgres database, schema `minecraft`. Stdlib plus `psycopg`. Memory limit 48 MB.
The Minecraft data directory is mounted read-only. There is no plugin and no RCON,
so players never see it.

This replaces the standalone `mc-telemetry` container that wrote `telemetry.db`.

**Private data.** `minecraft.logins`, `minecraft.ip_geo`, `minecraft.sessions`,
`minecraft.rejected_logins`, `minecraft.chat`, and `minecraft.commands` hold IPs,
locations, chat, and commands. The member profile API does not return chat,
commands, or rejected logins at all. Login IPs and geolocation are returned only
to `app_users.role = 'admin'`.

## What it does

Same behavior as the previous SQLite collector:

- On start, parse every `logs/*.log.gz` not yet in `minecraft.files`, then tail
  `logs/latest.log`. The offset and inode live in `minecraft.meta`, so a restart
  does not duplicate lines. Every event row has a content key `k`.
- Log times are America/New_York. Stored timestamps are `timestamptz`.
- Names map to current premium UUIDs via usercache and whitelist. Old offline-mode
  UUIDs are folded into the current player.
- Geolocation comes from ip-api.com (batched, at most one call every few seconds,
  cached in `minecraft.ip_geo`).
- Every 5 minutes: container memory/CPU from the Docker socket (`GET` stats only)
  and the advancement files (`world/players/advancements/*.json`, done, non-recipe).
- At 05:00 ET: copy stats files into `minecraft.stats_snapshots` and write nonzero
  per-stat deltas into `minecraft.daily_stats`. That row is the playday that just
  ended (05:00–05:00 ET), labeled by its start date. The first snapshot is a
  baseline only. If the collector is down at 05:00, the next run covers everything
  since the last snapshot. Daily deltas start 2026-11-20.

It does **not** create tables and it does **not** write `public.minecraft_sessions`,
`public.minecraft_deaths`, `public.minecraft_advancements`, or
`public.minecraft_daily_posts`. Those belong to the Discord bot recap. The site
sums `public.minecraft_sessions.duration_seconds` for active playtime.

## Apply the schema (manual)

From the repo on the VPS, after `dinkboard-postgres` is up. This is not run by
`deploy.sh` or by app startup.

```bash
docker exec -i dinkboard-postgres \
  psql -U dinkboard -d dinkboard -v ON_ERROR_STOP=1 \
  < deploy/postgres/minecraft.sql

docker exec -i dinkboard-postgres \
  psql -U dinkboard -d dinkboard -v ON_ERROR_STOP=1 \
  < deploy/postgres/minecraft_player_links.sql
```

The link seed inserts the eight known Minecraft UUID → `members.id` rows and
skips any Discord id that is not in `members`. Re-running it is safe.

## Import the old SQLite file (once)

Stop the old `mc-telemetry` container first so it is not writing the file.
The import copies every telemetry table, including `rolled_back` on deaths.
It does not print row contents.

```bash
docker compose \
  -f docker-compose.prod.yml \
  -f minecraft-collector/docker-compose.yml \
  --env-file .env run --rm --no-deps \
  -v /opt/apps/mc-telemetry/data/telemetry.db:/import/telemetry.db:ro \
  --entrypoint python mc-telemetry /app/import_sqlite.py /import/telemetry.db
```

If that SQLite file was rebuilt after the import and lost the rolled-back flag,
mark the deaths erased by the 2026-11-09 world restore:

```sql
UPDATE minecraft.deaths SET rolled_back = TRUE
WHERE ts >= TIMESTAMPTZ '2026-11-08 05:00:00 America/New_York'
  AND ts <  TIMESTAMPTZ '2026-11-09 15:00:00 America/New_York';
```

## Run the collector

`POSTGRES_PASSWORD` comes from the repo root `.env` (same value Postgres uses).
The service joins the compose network named `dinkboard` and talks to `postgres`.

```bash
docker compose \
  -f docker-compose.prod.yml \
  -f minecraft-collector/docker-compose.yml \
  --env-file .env up -d --build mc-telemetry

docker logs mc-telemetry
```

The container name stays `mc-telemetry` and the image name stays `dinkboard-mc-telemetry`. The build context is `./minecraft-collector` relative to the repo root, because this file is an overlay on `docker-compose.prod.yml`. A heartbeat file at `/data/heartbeat`
fails the healthcheck if it is older than 120 seconds.

## Period windows

Playdays run **05:00–05:00 America/New_York**, labeled by the morning they start.
That is the same window the bot stores as `minecraft_sessions.activity_date`.

| Toggle | Window |
|---|---|
| Daily | Latest `playday` present in `minecraft.daily_stats` (server-wide). |
| Weekly | That playday and the 6 before it (7 playdays). |
| Monthly | That playday and the 29 before it (30 playdays). |
| All-time | Latest `stats_snapshots` row (lifetime vanilla stats), not the sum of daily deltas. |

Death totals subtract `minecraft.deaths.rolled_back`. Active playtime is the sum of
`public.minecraft_sessions.duration_seconds`. Vanilla `minecraft:play_time` is shown
separately as time in world (it includes idle time).

## Admins

Login IPs are visible only to Dinkboard admins. `app_users.role` is `admin` or
`viewer`; new accounts are viewers. An existing admin changes roles on the Users
page (`PATCH /api/users/:id/role`). The first admin is designated in SQL:

```sql
UPDATE app_users SET role = 'admin' WHERE email = 'you@example.com';
```

Sign in again after that so the access token carries `role: admin`. Admins then
see the login table on the member's Minecraft section. Everyone else gets 403,
and logged-out requests get 401. The response never includes chat, commands, or
rejected logins.

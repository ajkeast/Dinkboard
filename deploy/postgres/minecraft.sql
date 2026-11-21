-- Minecraft telemetry for Dinkboard.
-- Apply manually over SSH. Do not put this file in server/migrations/:
-- deploy.sh runs those on every release, and app/bot startup must not migrate.
--
--   docker exec -i dinkboard-postgres \
--     psql -U dinkboard -d dinkboard -v ON_ERROR_STOP=1 \
--     < deploy/postgres/minecraft.sql
--
-- Then apply deploy/postgres/minecraft_player_links.sql (also manual).
--
-- This schema sits NEXT TO the Discord bot's public tables. It does not
-- create, alter, or replace them:
--   public.minecraft_sessions
--   public.minecraft_deaths
--   public.minecraft_advancements
--   public.minecraft_daily_posts
-- The bot (ajkeast/DiscordBot utils/minecraft_job.py) deletes and rewrites
-- those rows per activity_date for the Discord recap. The site only SELECTs
-- public.minecraft_sessions to show active vs likely-AFK playtime.
-- likely_afk means the unbroken session was longer than 6 hours.
--
-- Private tables (logins, ip_geo, rejected_logins, chat, commands, sessions)
-- are stored here and are not returned by member profile endpoints.
-- Login IPs and geolocation are admin-only, via the API, not by exposing
-- these tables. Chat, commands, and rejected logins are never served.

CREATE SCHEMA IF NOT EXISTS minecraft;

COMMENT ON SCHEMA minecraft IS
  'Collector telemetry. Distinct from public.minecraft_* (Discord bot recap).';

CREATE TABLE IF NOT EXISTS minecraft.meta (
  k  TEXT PRIMARY KEY,
  v  TEXT
);

CREATE TABLE IF NOT EXISTS minecraft.files (
  name       TEXT PRIMARY KEY,
  parsed_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS minecraft.players (
  name_lc  TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  uuid     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS players_uuid_idx ON minecraft.players (uuid);

CREATE TABLE IF NOT EXISTS minecraft.ip_geo (
  ip            TEXT PRIMARY KEY,
  country       TEXT,
  region        TEXT,
  city          TEXT,
  isp           TEXT,
  org           TEXT,
  asn           TEXT,
  mobile        BOOLEAN,
  proxy         BOOLEAN,
  hosting       BOOLEAN,
  looked_up_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS minecraft.logins (
  k        TEXT PRIMARY KEY,
  ts       TIMESTAMPTZ NOT NULL,
  player   TEXT,
  uuid     TEXT,
  ip       TEXT,
  country  TEXT,
  region   TEXT,
  city     TEXT,
  isp      TEXT,
  flags    TEXT
);

CREATE INDEX IF NOT EXISTS logins_uuid_ts_idx ON minecraft.logins (uuid, ts);
CREATE INDEX IF NOT EXISTS logins_ts_idx ON minecraft.logins (ts);

CREATE TABLE IF NOT EXISTS minecraft.rejected_logins (
  k       TEXT PRIMARY KEY,
  ts      TIMESTAMPTZ NOT NULL,
  name    TEXT,
  ip      TEXT,
  reason  TEXT
);

CREATE INDEX IF NOT EXISTS rejected_logins_ts_idx ON minecraft.rejected_logins (ts);

CREATE TABLE IF NOT EXISTS minecraft.sessions (
  player      TEXT,
  uuid        TEXT NOT NULL,
  ip          TEXT,
  joined_at   TIMESTAMPTZ NOT NULL,
  left_at     TIMESTAMPTZ,
  seconds     INTEGER,
  end_reason  TEXT,
  PRIMARY KEY (uuid, joined_at)
);

CREATE INDEX IF NOT EXISTS sessions_joined_idx ON minecraft.sessions (joined_at);
CREATE INDEX IF NOT EXISTS sessions_open_idx
  ON minecraft.sessions (uuid, joined_at)
  WHERE left_at IS NULL;

CREATE TABLE IF NOT EXISTS minecraft.deaths (
  k              TEXT PRIMARY KEY,
  ts             TIMESTAMPTZ NOT NULL,
  player         TEXT,
  uuid           TEXT,
  message        TEXT,
  killer_player  TEXT,
  rolled_back    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS deaths_ts_idx ON minecraft.deaths (ts);
CREATE INDEX IF NOT EXISTS deaths_uuid_idx ON minecraft.deaths (uuid);

COMMENT ON COLUMN minecraft.deaths.rolled_back IS
  'TRUE for deaths erased by a world restore. Lifetime and period death totals subtract these. The 2026-11-09 restore is not applied here; see minecraft-collector/README.md.';

CREATE TABLE IF NOT EXISTS minecraft.chat (
  k        TEXT PRIMARY KEY,
  ts       TIMESTAMPTZ NOT NULL,
  player   TEXT,
  message  TEXT
);

CREATE TABLE IF NOT EXISTS minecraft.commands (
  k        TEXT PRIMARY KEY,
  ts       TIMESTAMPTZ NOT NULL,
  player   TEXT,
  command  TEXT
);

CREATE TABLE IF NOT EXISTS minecraft.whitelist_events (
  k       TEXT PRIMARY KEY,
  ts      TIMESTAMPTZ NOT NULL,
  actor   TEXT,
  action  TEXT,
  target  TEXT
);

CREATE TABLE IF NOT EXISTS minecraft.server_events (
  k      TEXT PRIMARY KEY,
  ts     TIMESTAMPTZ NOT NULL,
  event  TEXT
);

CREATE TABLE IF NOT EXISTS minecraft.advancements (
  uuid         TEXT NOT NULL,
  player       TEXT,
  advancement  TEXT NOT NULL,
  earned_at    TIMESTAMPTZ,
  PRIMARY KEY (uuid, advancement)
);

CREATE TABLE IF NOT EXISTS minecraft.server_health (
  ts              TIMESTAMPTZ PRIMARY KEY,
  tps             DOUBLE PRECISION,
  mem_used_mb     DOUBLE PRECISION,
  mem_limit_mb    DOUBLE PRECISION,
  cpu_pct         DOUBLE PRECISION,
  players_online  INTEGER
);

-- Raw vanilla stats JSON (world/players/stats/<uuid>.json) at each 05:00 ET run.
-- kind is 'baseline' (first snapshot, no deltas) or 'daily'.
CREATE TABLE IF NOT EXISTS minecraft.stats_snapshots (
  taken_at  TIMESTAMPTZ NOT NULL,
  playday   DATE NOT NULL,
  kind      TEXT NOT NULL,
  uuid      TEXT NOT NULL,
  json      JSONB NOT NULL,
  PRIMARY KEY (taken_at, uuid)
);

CREATE INDEX IF NOT EXISTS stats_snapshots_uuid_taken_idx
  ON minecraft.stats_snapshots (uuid, taken_at DESC);

-- Nonzero per-stat difference from the previous snapshot.
-- playday is the 05:00–05:00 America/New_York window that just ended,
-- labeled by the morning it started. Deltas begin 2026-11-20.
CREATE TABLE IF NOT EXISTS minecraft.daily_stats (
  playday   DATE NOT NULL,
  player    TEXT,
  uuid      TEXT NOT NULL,
  category  TEXT NOT NULL,
  stat      TEXT NOT NULL,
  delta     BIGINT NOT NULL,
  PRIMARY KEY (playday, uuid, category, stat)
);

CREATE INDEX IF NOT EXISTS daily_stats_uuid_playday_idx
  ON minecraft.daily_stats (uuid, playday);

-- Operator-maintained. Seed file: deploy/postgres/minecraft_player_links.sql.
-- members.id is VARCHAR(20), the Discord snowflake.
CREATE TABLE IF NOT EXISTS minecraft.player_links (
  minecraft_uuid   TEXT PRIMARY KEY,
  discord_user_id  VARCHAR(20) NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  minecraft_name   TEXT,
  UNIQUE (discord_user_id)
);

COMMENT ON TABLE minecraft.player_links IS
  'Premium Minecraft UUID to members.id. Applied from minecraft_player_links.sql, not by the app.';

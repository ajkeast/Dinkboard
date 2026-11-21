#!/usr/bin/env python3
"""Copy an existing telemetry.db (SQLite) into the minecraft Postgres schema.

Run once on the VPS, after deploy/postgres/minecraft.sql. Does not seed
player_links and does not write public.minecraft_* (the Discord bot's tables).

    docker compose -f docker-compose.prod.yml -f minecraft-collector/docker-compose.yml \
      --env-file .env run --rm --no-deps \
      -v /opt/apps/mc-telemetry/data/telemetry.db:/import/telemetry.db:ro \
      --entrypoint python mc-telemetry /app/import_sqlite.py /import/telemetry.db

Or, with SQL_HOST / SQL_USER / SQL_PASSWORD / SQL_DATABASE (or DATABASE_URL) set:

    python import_sqlite.py /path/to/telemetry.db

Idempotent: running it again upserts the same rows. Prints table counts only.
"""
import json
import sqlite3
import sys

import psycopg
from psycopg.types.json import Json


def connect():
    url = __import__("os").environ.get("DATABASE_URL", "").strip()
    if url:
        return psycopg.connect(url)
    import os
    host = os.environ.get("SQL_HOST", "localhost")
    port = 5432
    if ":" in host:
        host, port_s = host.rsplit(":", 1)
        port = int(port_s)
    return psycopg.connect(
        host=host,
        port=port,
        user=os.environ.get("SQL_USER", "dinkboard"),
        password=os.environ.get("SQL_PASSWORD", ""),
        dbname=os.environ.get("SQL_DATABASE", "dinkboard"),
    )


def columns(con, table):
    rows = con.execute(f"PRAGMA table_info({table})").fetchall()
    return [r[1] for r in rows]


def boolish(value):
    if value is None:
        return None
    return bool(value)


def copy_table(src, cur, table, sql, row_fn):
    if not src.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (table,)
    ).fetchone():
        print(f"{table}: skipped (not in sqlite)")
        return 0
    rows = src.execute(f"SELECT * FROM {table}").fetchall()
    payload = [row_fn(r) for r in rows]
    if payload:
        cur.executemany(sql, payload)
    print(f"{table}: {len(payload)}")
    return len(payload)


def main():
    if len(sys.argv) != 2:
        print("usage: import_sqlite.py /path/to/telemetry.db", file=sys.stderr)
        sys.exit(2)
    src = sqlite3.connect(sys.argv[1])
    src.row_factory = sqlite3.Row
    dst = connect()
    try:
        with dst.cursor() as cur:
            found = cur.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'minecraft' AND table_name = 'meta'"
            ).fetchone()
            if not found:
                print("minecraft schema is missing. Apply deploy/postgres/minecraft.sql first.", file=sys.stderr)
                sys.exit(1)
        # The probe above opened a transaction. Commit it so the copy below
        # is the top-level transaction and actually persists.
        dst.commit()

        death_cols = set(columns(src, "deaths")) if src.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'deaths'"
        ).fetchone() else set()

        def death_row(r):
            rolled = r["rolled_back"] if "rolled_back" in death_cols else 0
            return (r["k"], r["ts"], r["player"], r["uuid"], r["message"], r["killer_player"], bool(rolled))

        def snapshot_row(r):
            raw = r["json"]
            if isinstance(raw, bytes):
                raw = raw.decode()
            return (r["taken_at"], r["playday"], r["kind"], r["uuid"], Json(json.loads(raw)))

        statements = [
            ("meta",
             "INSERT INTO minecraft.meta (k, v) VALUES (%s, %s) "
             "ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v",
             lambda r: (r["k"], r["v"])),
            ("files",
             "INSERT INTO minecraft.files (name, parsed_at) VALUES (%s, %s) "
             "ON CONFLICT (name) DO NOTHING",
             lambda r: (r["name"], r["parsed_at"])),
            ("players",
             "INSERT INTO minecraft.players (name_lc, name, uuid) VALUES (%s, %s, %s) "
             "ON CONFLICT (name_lc) DO UPDATE SET name = EXCLUDED.name, uuid = EXCLUDED.uuid",
             lambda r: (r["name_lc"], r["name"], r["uuid"])),
            ("ip_geo",
             "INSERT INTO minecraft.ip_geo "
             "(ip, country, region, city, isp, org, asn, mobile, proxy, hosting, looked_up_at) "
             "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
             "ON CONFLICT (ip) DO UPDATE SET "
             "country = EXCLUDED.country, region = EXCLUDED.region, city = EXCLUDED.city, "
             "isp = EXCLUDED.isp, org = EXCLUDED.org, asn = EXCLUDED.asn, "
             "mobile = EXCLUDED.mobile, proxy = EXCLUDED.proxy, hosting = EXCLUDED.hosting, "
             "looked_up_at = EXCLUDED.looked_up_at",
             lambda r: (r["ip"], r["country"], r["region"], r["city"], r["isp"], r["org"], r["asn"],
                        boolish(r["mobile"]), boolish(r["proxy"]), boolish(r["hosting"]), r["looked_up_at"])),
            ("logins",
             "INSERT INTO minecraft.logins (k, ts, player, uuid, ip, country, region, city, isp, flags) "
             "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
             "ON CONFLICT (k) DO UPDATE SET "
             "player = EXCLUDED.player, uuid = EXCLUDED.uuid, ip = EXCLUDED.ip, "
             "country = EXCLUDED.country, region = EXCLUDED.region, city = EXCLUDED.city, "
             "isp = EXCLUDED.isp, flags = EXCLUDED.flags",
             lambda r: (r["k"], r["ts"], r["player"], r["uuid"], r["ip"], r["country"], r["region"],
                        r["city"], r["isp"], r["flags"])),
            ("rejected_logins",
             "INSERT INTO minecraft.rejected_logins (k, ts, name, ip, reason) "
             "VALUES (%s, %s, %s, %s, %s) ON CONFLICT (k) DO NOTHING",
             lambda r: (r["k"], r["ts"], r["name"], r["ip"], r["reason"])),
            ("sessions",
             "INSERT INTO minecraft.sessions (player, uuid, ip, joined_at, left_at, seconds, end_reason) "
             "VALUES (%s, %s, %s, %s, %s, %s, %s) "
             "ON CONFLICT (uuid, joined_at) DO UPDATE SET "
             "player = EXCLUDED.player, ip = EXCLUDED.ip, left_at = EXCLUDED.left_at, "
             "seconds = EXCLUDED.seconds, end_reason = EXCLUDED.end_reason",
             lambda r: (r["player"], r["uuid"], r["ip"], r["joined_at"], r["left_at"], r["seconds"], r["end_reason"])),
            ("deaths",
             "INSERT INTO minecraft.deaths (k, ts, player, uuid, message, killer_player, rolled_back) "
             "VALUES (%s, %s, %s, %s, %s, %s, %s) "
             "ON CONFLICT (k) DO UPDATE SET "
             "player = EXCLUDED.player, uuid = EXCLUDED.uuid, message = EXCLUDED.message, "
             "killer_player = EXCLUDED.killer_player, rolled_back = EXCLUDED.rolled_back",
             death_row),
            ("chat",
             "INSERT INTO minecraft.chat (k, ts, player, message) VALUES (%s, %s, %s, %s) "
             "ON CONFLICT (k) DO NOTHING",
             lambda r: (r["k"], r["ts"], r["player"], r["message"])),
            ("commands",
             "INSERT INTO minecraft.commands (k, ts, player, command) VALUES (%s, %s, %s, %s) "
             "ON CONFLICT (k) DO NOTHING",
             lambda r: (r["k"], r["ts"], r["player"], r["command"])),
            ("whitelist_events",
             "INSERT INTO minecraft.whitelist_events (k, ts, actor, action, target) "
             "VALUES (%s, %s, %s, %s, %s) ON CONFLICT (k) DO NOTHING",
             lambda r: (r["k"], r["ts"], r["actor"], r["action"], r["target"])),
            ("server_events",
             "INSERT INTO minecraft.server_events (k, ts, event) VALUES (%s, %s, %s) "
             "ON CONFLICT (k) DO NOTHING",
             lambda r: (r["k"], r["ts"], r["event"])),
            ("advancements",
             "INSERT INTO minecraft.advancements (uuid, player, advancement, earned_at) "
             "VALUES (%s, %s, %s, %s) "
             "ON CONFLICT (uuid, advancement) DO UPDATE SET "
             "earned_at = LEAST(minecraft.advancements.earned_at, EXCLUDED.earned_at), "
             "player = EXCLUDED.player",
             lambda r: (r["uuid"], r["player"], r["advancement"], r["earned_at"])),
            ("server_health",
             "INSERT INTO minecraft.server_health "
             "(ts, tps, mem_used_mb, mem_limit_mb, cpu_pct, players_online) "
             "VALUES (%s, %s, %s, %s, %s, %s) "
             "ON CONFLICT (ts) DO UPDATE SET "
             "tps = EXCLUDED.tps, mem_used_mb = EXCLUDED.mem_used_mb, "
             "mem_limit_mb = EXCLUDED.mem_limit_mb, cpu_pct = EXCLUDED.cpu_pct, "
             "players_online = EXCLUDED.players_online",
             lambda r: (r["ts"], r["tps"], r["mem_used_mb"], r["mem_limit_mb"], r["cpu_pct"], r["players_online"])),
            ("stats_snapshots",
             "INSERT INTO minecraft.stats_snapshots (taken_at, playday, kind, uuid, json) "
             "VALUES (%s, %s, %s, %s, %s) "
             "ON CONFLICT (taken_at, uuid) DO NOTHING",
             snapshot_row),
            ("daily_stats",
             "INSERT INTO minecraft.daily_stats (playday, player, uuid, category, stat, delta) "
             "VALUES (%s, %s, %s, %s, %s, %s) "
             "ON CONFLICT (playday, uuid, category, stat) DO UPDATE SET "
             "player = EXCLUDED.player, delta = EXCLUDED.delta",
             lambda r: (r["playday"], r["player"], r["uuid"], r["category"], r["stat"], r["delta"])),
        ]

        with dst.transaction():
            with dst.cursor() as cur:
                for table, sql, fn in statements:
                    copy_table(src, cur, table, sql, fn)
        print("import complete")
    finally:
        dst.close()
        src.close()


if __name__ == "__main__":
    main()

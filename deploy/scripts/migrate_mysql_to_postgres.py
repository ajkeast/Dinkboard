#!/usr/bin/env python3
"""One-shot MySQL → Postgres data copy for the Dinkboard / DiscordBot shared DB.

Env (source MySQL):
  MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
  (MYSQL_HOST may include :port)

Env (target Postgres):
  PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
"""

from __future__ import annotations

import json
import os
import sys

import pymysql
import psycopg
from psycopg.types.json import Jsonb

TABLES = [
    "members",
    "channels",
    "emojis",
    "messages",
    "firstlist_id",
    "chatgpt_logs",
    "dalle_3_prompts",
    "dinkcoin_balances",
    "dinkcoin_transactions",
    "message_sentiment",
    "app_users",
    "app_refresh_tokens",
    "app_analytics_events",
    "app_schema_migrations",
]

JSON_COLS = {
    "chatgpt_logs": {"request_messages", "function_calls", "image_urls"},
    "app_analytics_events": {"properties"},
}

BOOL_COLS = {
    "message_sentiment": {"sarcasm"},
}

SERIAL_RESET = {
    "chatgpt_logs": "chatgpt_logs_id_seq",
    "dalle_3_prompts": "dalle_3_prompts_id_seq",
    "dinkcoin_transactions": "dinkcoin_transactions_id_seq",
    "app_users": "app_users_id_seq",
    "app_refresh_tokens": "app_refresh_tokens_id_seq",
    "app_analytics_events": "app_analytics_events_id_seq",
}


def env(name: str, default: str | None = None) -> str:
    raw = os.getenv(name, default if default is not None else "")
    return raw.replace("'", "").replace('"', "").strip()


def mysql_conn():
    host = env("MYSQL_HOST")
    port = 3306
    if ":" in host:
        host, port_s = host.rsplit(":", 1)
        port = int(port_s)
    return pymysql.connect(
        host=host,
        port=port,
        user=env("MYSQL_USER"),
        password=env("MYSQL_PASSWORD"),
        database=env("MYSQL_DATABASE"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.SSCursor,
    )


def pg_conn():
    return psycopg.connect(
        host=env("PGHOST", "postgres"),
        port=int(env("PGPORT", "5432")),
        user=env("PGUSER", "dinkboard"),
        password=env("PGPASSWORD"),
        dbname=env("PGDATABASE", "dinkboard"),
    )


def transform(table: str, columns: list[str], row: tuple):
    out = []
    json_cols = JSON_COLS.get(table, set())
    bool_cols = BOOL_COLS.get(table, set())
    for col, val in zip(columns, row):
        if col in json_cols:
            if val is None:
                out.append(None)
            elif isinstance(val, (dict, list)):
                out.append(Jsonb(val))
            else:
                try:
                    out.append(Jsonb(json.loads(val)))
                except (TypeError, json.JSONDecodeError):
                    out.append(Jsonb(val) if val else None)
        elif col in bool_cols:
            out.append(bool(val) if val is not None else None)
        else:
            out.append(val)
    return tuple(out)


def copy_table(mysql_c, pg_c, table: str) -> int:
    with mysql_c.cursor() as cur:
        cur.execute(f"SELECT * FROM `{table}`")
        columns = [d[0] for d in cur.description]
        rows = cur.fetchall()

    if not rows:
        print(f"  {table}: 0 rows")
        return 0

    col_list = ", ".join(f'"{c}"' for c in columns)
    placeholders = ", ".join(["%s"] * len(columns))
    insert = f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders})'

    batch = [transform(table, columns, r) for r in rows]
    with pg_c.cursor() as cur:
        cur.executemany(insert, batch)
        if table in SERIAL_RESET and "id" in columns:
            id_idx = columns.index("id")
            max_id = max(int(r[id_idx]) for r in rows if r[id_idx] is not None)
            seq = SERIAL_RESET[table]
            cur.execute(
                "SELECT setval(%s, %s, true)",
                (seq, max_id),
            )
    pg_c.commit()
    print(f"  {table}: {len(batch)} rows")
    return len(batch)


def main() -> int:
    required = [
        "MYSQL_HOST",
        "MYSQL_USER",
        "MYSQL_PASSWORD",
        "MYSQL_DATABASE",
        "PGPASSWORD",
    ]
    missing = [k for k in required if not env(k)]
    if missing:
        print("Missing env:", ", ".join(missing), file=sys.stderr)
        return 1

    print("Connecting…")
    mysql_c = mysql_conn()
    pg_c = pg_conn()
    try:
        with pg_c.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
            # Truncate in reverse FK order for re-runs
            cur.execute(
                "TRUNCATE TABLE "
                + ", ".join(f'"{t}"' for t in reversed(TABLES))
                + " RESTART IDENTITY CASCADE"
            )
        pg_c.commit()

        total = 0
        for table in TABLES:
            total += copy_table(mysql_c, pg_c, table)
        print(f"Done. Copied {total} rows across {len(TABLES)} tables.")
        return 0
    finally:
        mysql_c.close()
        pg_c.close()


if __name__ == "__main__":
    raise SystemExit(main())

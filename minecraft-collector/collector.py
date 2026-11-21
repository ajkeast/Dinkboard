#!/usr/bin/env python3
"""mc-telemetry: record Minecraft server activity into Postgres.

Reads the Minecraft data dir read-only (logs, stats, advancements, usercache).
Never talks to the game server, so nothing is visible to players.

Writes only the minecraft.* schema in the Dinkboard database. It does not
touch public.minecraft_* (those belong to the Discord bot recap).

Apply deploy/postgres/minecraft.sql before starting. This process does not
create tables.
"""
import glob, gzip, hashlib, http.client, json, os, re, socket, sys, time
import urllib.request, uuid as uuidlib
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import psycopg

TZ = ZoneInfo("America/New_York")
MC = os.environ.get("MC_DIR", "/mc")
LOGS = os.path.join(MC, "logs")
DOCKER_SOCK = "/var/run/docker.sock"
MC_CONTAINER = os.environ.get("MC_CONTAINER", "minecraft")
HEARTBEAT = os.environ.get("HEARTBEAT_PATH", "/data/heartbeat")
SNAP_HOUR = 5

LINE = re.compile(r"^\[(\d\d):(\d\d):(\d\d)\] \[([^\]]*?)/(\w+)\]: (.*)$")
ANSI = re.compile(r"\x1b?\[[0-9;]*m")
R_UUID = re.compile(r"^UUID of player (\w+) is ([0-9a-f-]{36})")
R_PREM = re.compile(r"^Player '(\w+)' identified as PREMIUM.*UUID ([0-9a-f-]{36})")
R_LOGIN = re.compile(r"^(\w+)\[/(.+):\d+\] logged in with entity id")
R_PRE = re.compile(r"^(\w+) \(/(.+):\d+\) lost connection: (.*)$")
R_MAL = re.compile(r"^/(.+):\d+ lost connection: (.*)$")
R_LEFT = re.compile(r"^(\w+) lost connection: (.*)$")
R_CHAT = re.compile(r"^(?:\[Not Secure\] )?<(\w+)> (.*)$")
R_CMD = re.compile(r"^(\w+) issued server command: (.*)$")
R_WL = re.compile(r"^(?:(\w+) )?(added|removed) (\w+)(?: \([0-9a-f-]+\))? (?:to|from) the whitelist", re.I)
R_KILLER = re.compile(r"\b(?:by|fighting|escape|whilst fighting) (\w{3,16})")
NOT_DEATH = ("joined the game", "left the game", "has made the advancement",
             "has completed the challenge", "has reached the goal",
             "has honored the Centurion Law", "defied the Centurion Law")


def iso(dt):
    return dt.isoformat(timespec="seconds")


def now():
    return datetime.now(TZ)


def as_dt(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=TZ)
        return value.astimezone(TZ)
    return datetime.fromisoformat(str(value))


def offline_uuid(name):
    return str(uuidlib.UUID(bytes=hashlib.md5(b"OfflinePlayer:" + name.encode()).digest(), version=3))


def key(*parts):
    return hashlib.sha1("|".join(map(str, parts)).encode()).hexdigest()[:20]


def stats_of(doc):
    if isinstance(doc, str):
        doc = json.loads(doc)
    if not isinstance(doc, dict):
        return {}
    return doc.get("stats", {}) or {}


def connect():
    url = os.environ.get("DATABASE_URL", "").strip()
    if url:
        return psycopg.connect(url)
    host = os.environ.get("SQL_HOST", "postgres")
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


class DB:
    def __init__(self, conn):
        self.conn = conn

    def execute(self, sql, params=()):
        cur = self.conn.cursor()
        cur.execute(sql, params)
        return cur

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()


class Collector:
    def __init__(self):
        os.makedirs(os.path.dirname(HEARTBEAT) or ".", exist_ok=True)
        self.db = DB(connect())
        self._require_schema()
        self.names = {}       # name_lc -> (canonical name, uuid)
        self.by_uuid = {}     # any uuid (incl. old offline) -> (name, canonical uuid)
        self.load_identities()
        self.open = {}        # uuid -> (joined_at dt, epoch, ip, player)
        self._load_open()
        self.last_ts = None
        self.dup = {}
        self.last_rej = None
        self.cpu_prev = None
        self.last_geo_call = 0

    def _require_schema(self):
        row = self.db.execute(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'minecraft' AND table_name = 'meta'"
        ).fetchone()
        if not row:
            log("minecraft schema is missing. Apply deploy/postgres/minecraft.sql first.")
            sys.exit(1)

    def reconnect(self):
        try:
            self.db.conn.close()
        except Exception:
            pass
        self.db = DB(connect())
        self._load_open()

    def _load_open(self):
        self.open = {}
        for p, u, ip, j in self.db.execute(
            "SELECT player, uuid, ip, joined_at FROM minecraft.sessions WHERE left_at IS NULL"
        ):
            jdt = as_dt(j)
            self.open[u] = (jdt, jdt.timestamp(), ip, p)

    # ---- identities -----------------------------------------------------
    def load_identities(self):
        for n, u in self.db.execute("SELECT name, uuid FROM minecraft.players").fetchall():
            self.learn(n, u, write=False)
        for fn in ("whitelist.json", "usercache.json"):   # usercache last = current names win
            try:
                for e in json.load(open(os.path.join(MC, fn))):
                    # usercache can hold a stale offline-mode entry too; never let it win
                    self.learn(e["name"], e["uuid"], force=e["uuid"] != offline_uuid(e["name"]))
            except (OSError, ValueError, KeyError):
                pass
        self.db.commit()

    def learn(self, name, u, force=False, write=True):
        """Map a name to its current (premium) uuid; old offline-mode uuids become aliases."""
        nl = name.lower()
        cur = self.names.get(nl)
        if force or cur is None or (u != offline_uuid(name) and cur[1] == offline_uuid(cur[0])):
            cur = (name if force or cur is None else cur[0], u)
            self.names[nl] = cur
            if write:
                self.db.execute(
                    "INSERT INTO minecraft.players (name_lc, name, uuid) VALUES (%s, %s, %s) "
                    "ON CONFLICT (name_lc) DO UPDATE SET name = EXCLUDED.name, uuid = EXCLUDED.uuid",
                    (nl, cur[0], cur[1]),
                )
        for x in (u, cur[1], offline_uuid(name), offline_uuid(cur[0])):
            self.by_uuid[x] = cur

    def ident(self, name):
        n, u = self.names.get(name.lower(), (name, None))
        return n, u or offline_uuid(name)

    # ---- log parsing -----------------------------------------------------
    def handle(self, dt, thread, msg, raw):
        ts = iso(dt)
        c = self.dup.get((ts, raw), 0)
        self.dup[(ts, raw)] = c + 1
        k = key(ts, raw, c)
        ex = self.db.execute
        if thread.startswith("User Authenticator"):
            m = R_PREM.match(msg) or R_UUID.match(msg)
            if m:
                self.learn(m.group(1), m.group(2))
            return
        if thread.startswith("Async Chat"):
            m = R_CHAT.match(msg)
            if m:
                ex(
                    "INSERT INTO minecraft.chat (k, ts, player, message) VALUES (%s, %s, %s, %s) "
                    "ON CONFLICT (k) DO NOTHING",
                    (k, ts, self.ident(m.group(1))[0], m.group(2)),
                )
            return
        if not thread.startswith("Server thread"):
            return
        self.last_rej = None
        if msg.startswith("Starting minecraft server version") or msg == "Stopping server":
            ev = "start" if msg.startswith("Starting") else "stop"
            ex(
                "INSERT INTO minecraft.server_events (k, ts, event) VALUES (%s, %s, %s) "
                "ON CONFLICT (k) DO NOTHING",
                (k, ts, ev),
            )
            self.close_all(self.last_ts if ev == "start" and self.last_ts else dt, "server_" + ev)
            return
        m = R_LOGIN.match(msg)
        if m:
            name, ip = m.groups()
            n, u = self.ident(name)
            new_ip = ex(
                "SELECT 1 FROM minecraft.logins WHERE uuid = %s AND ip = %s", (u, ip)
            ).fetchone() is None
            ex(
                "INSERT INTO minecraft.logins (k, ts, player, uuid, ip, flags) "
                "VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (k) DO NOTHING",
                (k, ts, n, u, ip, "new_ip" if new_ip else ""),
            )
            if u in self.open:
                self.close(u, dt, "rejoin")
            ex(
                "INSERT INTO minecraft.sessions (player, uuid, ip, joined_at) "
                "VALUES (%s, %s, %s, %s) ON CONFLICT (uuid, joined_at) DO NOTHING",
                (n, u, ip, dt),
            )
            row = ex(
                "SELECT left_at FROM minecraft.sessions WHERE uuid = %s AND joined_at = %s",
                (u, dt),
            ).fetchone()
            if row and row[0] is None:
                self.open[u] = (dt, dt.timestamp(), ip, n)
            return
        m = R_PRE.match(msg)
        if m:
            ex(
                "INSERT INTO minecraft.rejected_logins (k, ts, name, ip, reason) "
                "VALUES (%s, %s, %s, %s, %s) ON CONFLICT (k) DO NOTHING",
                (k, ts, m.group(1), m.group(2), m.group(3)[:200]),
            )
            self.last_rej = k
            return
        m = R_MAL.match(msg)
        if m:
            reason = "malformed packet" if "Internal Exception" in m.group(2) else m.group(2)[:200]
            ex(
                "INSERT INTO minecraft.rejected_logins (k, ts, name, ip, reason) "
                "VALUES (%s, %s, %s, %s, %s) ON CONFLICT (k) DO NOTHING",
                (k, ts, None, m.group(1), reason),
            )
            return
        m = R_LEFT.match(msg)
        if m:
            n, u = self.ident(m.group(1))
            self.close(u, dt, m.group(2)[:100])
            return
        m = R_CMD.match(msg)
        if m:
            n, u = self.ident(m.group(1))
            ex(
                "INSERT INTO minecraft.commands (k, ts, player, command) "
                "VALUES (%s, %s, %s, %s) ON CONFLICT (k) DO NOTHING",
                (k, ts, n, m.group(2)),
            )
            return
        m = R_WL.match(msg)
        if m:
            ex(
                "INSERT INTO minecraft.whitelist_events (k, ts, actor, action, target) "
                "VALUES (%s, %s, %s, %s, %s) ON CONFLICT (k) DO NOTHING",
                (k, ts, m.group(1) or "console", m.group(2).lower(), m.group(3)),
            )
            return
        if msg.startswith("System chat: "):
            body = ANSI.sub("", msg[13:]).strip()
            rm = re.match(r"^\[Rcon: (Added|Removed) (\w+) (?:to|from) the whitelist", body)
            if rm:
                ex(
                    "INSERT INTO minecraft.whitelist_events (k, ts, actor, action, target) "
                    "VALUES (%s, %s, %s, %s, %s) ON CONFLICT (k) DO NOTHING",
                    (k, ts, "rcon", rm.group(1).lower(), rm.group(2)),
                )
                return
            first, _, rest = body.partition(" ")
            if rest and first.lower() in self.names and not any(rest.startswith(x) for x in NOT_DEATH):
                n, u = self.ident(first)
                km = R_KILLER.search(rest)
                killer = self.ident(km.group(1))[0] if km and km.group(1).lower() in self.names else None
                ex(
                    "INSERT INTO minecraft.deaths (k, ts, player, uuid, message, killer_player) "
                    "VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (k) DO NOTHING",
                    (k, ts, n, u, body, killer),
                )

    def close(self, u, dt, reason):
        s = self.open.get(u)
        if not s or s[1] > dt.timestamp():
            return
        secs = int(dt.timestamp() - s[1])
        self.db.execute(
            "UPDATE minecraft.sessions SET left_at = %s, seconds = %s, end_reason = %s "
            "WHERE uuid = %s AND joined_at = %s AND left_at IS NULL",
            (dt, secs, reason, u, s[0]),
        )
        del self.open[u]

    def close_all(self, dt, reason):
        for u in list(self.open):
            self.close(u, dt, reason)

    def feed(self, text, day):
        """Parse complete lines of one file whose lines all belong to calendar date `day`."""
        for raw in text.splitlines():
            m = LINE.match(raw)
            if not m:
                if self.last_rej and raw.startswith("Reason:"):
                    self.db.execute(
                        "UPDATE minecraft.rejected_logins "
                        "SET reason = reason || ' (' || %s || ')' WHERE k = %s",
                        (raw[7:].strip()[:80], self.last_rej),
                    )
                continue
            h, mi, s, thread, _lvl, msg = m.groups()
            dt = datetime(day.year, day.month, day.day, int(h), int(mi), int(s), tzinfo=TZ)
            self.handle(dt, thread, msg, raw)
            self.last_ts = dt
        self.db.commit()

    def gz_files(self):
        def sk(p):
            b = os.path.basename(p)[:-7]
            d, _, n = b.rpartition("-")
            return (d, int(n))
        return sorted(glob.glob(os.path.join(LOGS, "*-*.log.gz")), key=sk)

    def parse_new_gz(self):
        done = {r[0] for r in self.db.execute("SELECT name FROM minecraft.files")}
        for p in self.gz_files():
            b = os.path.basename(p)
            if b in done:
                continue
            day = datetime.strptime(b[:10], "%Y-%m-%d").date()
            self.dup = {}
            try:
                text = gzip.open(p, "rb").read().decode("utf-8", "replace")
            except (OSError, EOFError) as e:      # e.g. still being compressed
                log(f"skip {b}: {e}")
                continue
            self.feed(text, day)
            self.db.execute(
                "INSERT INTO minecraft.files (name, parsed_at) VALUES (%s, %s) "
                "ON CONFLICT (name) DO NOTHING",
                (b, iso(now())),
            )
            self.db.commit()
            log(f"parsed {b}")

    # ---- live tail of latest.log -----------------------------------------
    def meta(self, k, v=None):
        if v is None:
            r = self.db.execute("SELECT v FROM minecraft.meta WHERE k = %s", (k,)).fetchone()
            return r and r[0]
        self.db.execute(
            "INSERT INTO minecraft.meta (k, v) VALUES (%s, %s) "
            "ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v",
            (k, str(v)),
        )

    def tail_open(self):
        path = os.path.join(LOGS, "latest.log")
        self.fh = open(path, "rb")
        ino = os.fstat(self.fh.fileno()).st_ino
        off = int(self.meta("latest_offset") or 0) if self.meta("latest_inode") == str(ino) else 0
        if off > os.fstat(self.fh.fileno()).st_size:
            off = 0
        self.fh.seek(off)
        self.ino = ino
        self.buf = b""
        self.dup = {}

    def tail_read(self):
        data = self.fh.read()
        if data:
            data = self.buf + data
            cut = data.rfind(b"\n") + 1
            self.buf = data[cut:]
            # every line in latest.log shares one date (log4j rolls at midnight): the file's mtime date
            day = datetime.fromtimestamp(os.fstat(self.fh.fileno()).st_mtime, TZ).date()
            self.feed(data[:cut].decode("utf-8", "replace"), day)
            self.meta("latest_inode", self.ino)
            self.meta("latest_offset", self.fh.tell() - len(self.buf))
            self.db.commit()

    def tail_step(self):
        self.tail_read()
        try:
            st = os.stat(os.path.join(LOGS, "latest.log"))
        except FileNotFoundError:
            return
        if st.st_ino != self.ino or st.st_size < self.fh.tell():
            self.tail_read()
            self.fh.close()
            self.parse_new_gz()          # the rotated file; duplicates are ignored by keys
            self.meta("latest_offset", 0)
            self.meta("latest_inode", st.st_ino)
            self.tail_open()
            self.tail_read()

    # ---- geo ---------------------------------------------------------------
    def geo_fill(self):
        ips = [r[0] for r in self.db.execute(
            "SELECT DISTINCT ip FROM ("
            "  SELECT ip FROM minecraft.logins "
            "  UNION SELECT ip FROM minecraft.rejected_logins"
            ") s WHERE ip IS NOT NULL AND ip NOT IN (SELECT ip FROM minecraft.ip_geo)"
        )]
        for i in range(0, len(ips), 100):
            if time.time() - self.last_geo_call < 4.5:
                time.sleep(4.5 - (time.time() - self.last_geo_call))
            chunk = ips[i:i + 100]
            try:
                req = urllib.request.Request(
                    "http://ip-api.com/batch?fields=status,message,country,regionName,city,isp,org,as,mobile,proxy,hosting,query",
                    data=json.dumps(chunk).encode(),
                    headers={"Content-Type": "application/json"},
                )
                res = json.load(urllib.request.urlopen(req, timeout=15))
            except Exception as e:
                log(f"geo lookup failed: {e}")
                return
            finally:
                self.last_geo_call = time.time()
            for r in res:
                ok = r.get("status") == "success"

                def flag(name):
                    v = r.get(name)
                    if v is None:
                        return None
                    return bool(v)

                self.db.execute(
                    "INSERT INTO minecraft.ip_geo "
                    "(ip, country, region, city, isp, org, asn, mobile, proxy, hosting, looked_up_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
                    "ON CONFLICT (ip) DO UPDATE SET "
                    "country = EXCLUDED.country, region = EXCLUDED.region, city = EXCLUDED.city, "
                    "isp = EXCLUDED.isp, org = EXCLUDED.org, asn = EXCLUDED.asn, "
                    "mobile = EXCLUDED.mobile, proxy = EXCLUDED.proxy, hosting = EXCLUDED.hosting, "
                    "looked_up_at = EXCLUDED.looked_up_at",
                    (
                        r["query"],
                        r.get("country") if ok else r.get("message"),
                        r.get("regionName"),
                        r.get("city"),
                        r.get("isp"),
                        r.get("org"),
                        r.get("as"),
                        flag("mobile"),
                        flag("proxy"),
                        flag("hosting"),
                        iso(now()),
                    ),
                )
        rows = self.db.execute(
            "SELECT l.k, l.ts, l.uuid, l.flags, g.country, g.region, g.city, g.isp, "
            "g.mobile, g.proxy, g.hosting "
            "FROM minecraft.logins l JOIN minecraft.ip_geo g ON g.ip = l.ip "
            "WHERE l.country IS NULL ORDER BY l.ts"
        ).fetchall()
        for k, ts, u, flags, co, rg, ci, isp, mob, prox, host in rows:
            f = [x for x in (flags or "").split(",") if x]
            f += [n for n, v in (("mobile", mob), ("proxy", prox), ("hosting", host)) if v]
            prior = self.db.execute(
                "SELECT country FROM minecraft.logins "
                "WHERE uuid = %s AND ts < %s AND country IS NOT NULL",
                (u, ts),
            ).fetchall()
            if prior and co not in {p[0] for p in prior}:
                f.append("new_country")
            self.db.execute(
                "UPDATE minecraft.logins SET country = %s, region = %s, city = %s, isp = %s, flags = %s "
                "WHERE k = %s",
                (co, rg, ci, isp, ",".join(f), k),
            )
        self.db.commit()

    # ---- advancements --------------------------------------------------------
    def advancements(self):
        for p in glob.glob(os.path.join(MC, "world/players/advancements/*.json")):
            fu = os.path.basename(p)[:-5]
            n, u = self.by_uuid.get(fu, (None, fu))
            n = n or next((nm for nl, (nm, uu) in self.names.items() if uu == fu), fu)
            try:
                d = json.load(open(p))
            except (OSError, ValueError):
                continue
            for adv, v in d.items():
                if not isinstance(v, dict) or not v.get("done") or not v.get("criteria") \
                        or adv.startswith("minecraft:recipes/"):
                    continue
                when = max(datetime.strptime(t, "%Y-%m-%d %H:%M:%S %z") for t in v["criteria"].values())
                self.db.execute(
                    "INSERT INTO minecraft.advancements (uuid, player, advancement, earned_at) "
                    "VALUES (%s, %s, %s, %s) "
                    "ON CONFLICT (uuid, advancement) DO UPDATE SET "
                    "earned_at = LEAST(minecraft.advancements.earned_at, EXCLUDED.earned_at), "
                    "player = EXCLUDED.player",
                    (u, n, adv, iso(when.astimezone(TZ))),
                )
        self.db.commit()

    # ---- daily stats -----------------------------------------------------------
    def snapshot_due(self):
        t = now()
        last = self.db.execute("SELECT max(taken_at) FROM minecraft.stats_snapshots").fetchone()[0]
        if last is None:
            return "baseline", (t - timedelta(hours=SNAP_HOUR)).date()
        cut = t.replace(hour=SNAP_HOUR, minute=0, second=0, microsecond=0)
        if t >= cut and as_dt(last) < cut:
            return "daily", (cut - timedelta(days=1)).date()
        return None

    def snapshot(self, kind, playday):
        t = iso(now())
        cur = {}
        for p in glob.glob(os.path.join(MC, "world/players/stats/*.json")):
            u = os.path.basename(p)[:-5]
            try:
                raw = open(p).read()
                json.loads(raw)
            except (OSError, ValueError):
                continue
            self.db.execute(
                "INSERT INTO minecraft.stats_snapshots (taken_at, playday, kind, uuid, json) "
                "VALUES (%s, %s, %s, %s, %s::jsonb) "
                "ON CONFLICT (taken_at, uuid) DO NOTHING",
                (t, playday, kind, u, raw),
            )
            cur[u] = stats_of(raw)
        if kind == "daily":
            prev_t = self.db.execute(
                "SELECT max(taken_at) FROM minecraft.stats_snapshots WHERE taken_at < %s",
                (t,),
            ).fetchone()[0]
            prev = {}
            if prev_t is not None:
                prev = {
                    u: stats_of(j)
                    for u, j in self.db.execute(
                        "SELECT uuid, json FROM minecraft.stats_snapshots WHERE taken_at = %s",
                        (prev_t,),
                    )
                }
            agg = {}
            for u, st in cur.items():
                n, cu = self.by_uuid.get(u, (None, u))
                n = n or next((nm for nl, (nm, uu) in self.names.items() if uu == u), u)
                old = prev.get(u, {})
                for cat in set(st) | set(old):
                    for s in set(st.get(cat, {})) | set(old.get(cat, {})):
                        d = st.get(cat, {}).get(s, 0) - old.get(cat, {}).get(s, 0)
                        if d:
                            kk = (cu, cat, s)
                            agg[kk] = (n, agg.get(kk, (n, 0))[1] + d)
            for (cu, cat, s), (n, d) in agg.items():
                if d:
                    self.db.execute(
                        "INSERT INTO minecraft.daily_stats (playday, player, uuid, category, stat, delta) "
                        "VALUES (%s, %s, %s, %s, %s, %s) "
                        "ON CONFLICT (playday, uuid, category, stat) DO UPDATE SET "
                        "player = EXCLUDED.player, delta = EXCLUDED.delta",
                        (playday, n, cu, cat, s, d),
                    )
        self.db.commit()
        log(f"stats snapshot {kind} playday={playday} files={len(cur)}")

    # ---- server health -----------------------------------------------------------
    def health(self):
        mem = lim = cpu = None
        try:
            c = http.client.HTTPConnection("docker", timeout=10)
            c.sock = socket.socket(socket.AF_UNIX)
            c.sock.settimeout(10)
            c.sock.connect(DOCKER_SOCK)
            c.request("GET", f"/containers/{MC_CONTAINER}/stats?stream=false&one-shot=true")
            s = json.load(c.getresponse())
            c.close()
            ms = s["memory_stats"]
            mem = (ms["usage"] - ms.get("stats", {}).get("inactive_file", 0)) / 2**20
            lim = ms.get("limit", 0) / 2**20
            cu, sy = s["cpu_stats"]["cpu_usage"]["total_usage"], s["cpu_stats"].get("system_cpu_usage", 0)
            if self.cpu_prev and sy > self.cpu_prev[1]:
                cpu = (cu - self.cpu_prev[0]) / (sy - self.cpu_prev[1]) * s["cpu_stats"].get("online_cpus", 1) * 100
            self.cpu_prev = (cu, sy)
        except Exception as e:
            log(f"health: docker stats failed: {e}")
        self.db.execute(
            "INSERT INTO minecraft.server_health "
            "(ts, tps, mem_used_mb, mem_limit_mb, cpu_pct, players_online) "
            "VALUES (%s, %s, %s, %s, %s, %s) "
            "ON CONFLICT (ts) DO UPDATE SET "
            "tps = EXCLUDED.tps, mem_used_mb = EXCLUDED.mem_used_mb, "
            "mem_limit_mb = EXCLUDED.mem_limit_mb, cpu_pct = EXCLUDED.cpu_pct, "
            "players_online = EXCLUDED.players_online",
            (
                iso(now()),
                None,
                mem and round(mem, 1),
                lim and round(lim, 1),
                cpu and round(cpu, 1),
                len(self.open),
            ),
        )
        self.db.commit()

    def run(self):
        self.parse_new_gz()
        self.tail_open()
        self.tail_read()
        log(f"backfill done; open sessions: {sorted(v[3] for v in self.open.values())}")
        self.advancements()
        self.geo_fill()
        nxt = {"health": 0, "geo": 0, "adv": time.time() + 300}
        while True:
            try:
                self.tail_step()
                t = time.time()
                if t >= nxt["health"]:
                    self.health()
                    nxt["health"] = t - t % 300 + 300
                if t >= nxt["geo"]:
                    self.geo_fill()
                    nxt["geo"] = t + 60
                if t >= nxt["adv"]:
                    self.advancements()
                    nxt["adv"] = t + 300
                due = self.snapshot_due()
                if due:
                    self.snapshot(*due)
            except psycopg.Error as e:
                log(f"db error, reconnecting: {e.__class__.__name__}")
                try:
                    self.db.rollback()
                except Exception:
                    pass
                time.sleep(2)
                try:
                    self.reconnect()
                except psycopg.Error as again:
                    log(f"reconnect failed: {again.__class__.__name__}")
            open(HEARTBEAT, "w").close()
            time.sleep(2)


def log(m):
    print(f"{iso(now())} {m}", flush=True)


if __name__ == "__main__":
    Collector().run()

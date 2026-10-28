#!/usr/bin/env python3
"""Bar-chart race of cumulative firsts, with avatar and username.

Standalone. Nothing in the Dinkboard app imports this.

  python3 firsts_race.py --demo -o firsts-race.mp4
  python3 firsts_race.py --env ../../server/.env -o firsts-race.mp4
  python3 firsts_race.py --input events.json -o firsts-race.mp4

--input accepts either a list of events:

  [{"user_id": "1", "name": "Ada", "avatar": "https://...", "timesent": 1700000000}]

or the /api/firsts/cumcount shape (avatar and user_id optional on each series):

  [{"name": "Ada", "user_id": "1", "avatar": "...", "data": [{"timesent": 1700000000, "cum_count": 1}]}]

timesent is unix seconds, unix milliseconds, or an ISO-8601 timestamp.
avatar is an http(s) URL, a local image path, or a Discord avatar hash
(combined with user_id into a CDN url). Missing images fall back to initials.

Requires ffmpeg on PATH, plus the packages in requirements.txt.
Postgres mode reads SQL_HOST, SQL_USER, SQL_PASSWORD, and SQL_DATABASE.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

PALETTE = [
    (142, 123, 218),
    (34, 160, 107),
    (217, 119, 6),
    (59, 130, 246),
    (219, 39, 119),
    (8, 145, 178),
    (202, 138, 4),
    (167, 139, 250),
    (52, 211, 153),
    (244, 114, 182),
    (96, 165, 250),
    (251, 191, 36),
]

BG = (14, 16, 22)
TITLE = (236, 236, 241)
MUTED = (148, 152, 166)
DATE = (92, 96, 112)
VALUE = (236, 236, 241)

FONT_CANDIDATES = {
    "medium": [
        "/usr/share/fonts/truetype/macos/Inter-Medium.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ],
    "semibold": [
        "/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ],
}


class User:
    def __init__(self, user_id, name, avatar, points):
        self.user_id = str(user_id)
        self.name = display_name(name)
        self.avatar = avatar or None
        self.points = points
        self.color = PALETTE[0]
        self.icon = None

    @property
    def total(self):
        return self.points[-1][1] if self.points else 0


def display_name(name):
    text = re.sub(r":[a-zA-Z0-9_+]+:", "", str(name or ""))
    text = re.sub(r"\s+", " ", text).strip()
    return text or "Unknown"


def initials(name):
    parts = [p for p in re.split(r"\s+", name) if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[1][0]).upper()


def parse_time(value):
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        n = float(value)
        if n > 10_000_000_000:
            n /= 1000.0
        return n
    text = str(value).strip()
    if re.fullmatch(r"-?\d+(\.\d+)?", text):
        return parse_time(float(text))
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    moment = datetime.fromisoformat(text)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.timestamp()


def value_at(points, time):
    """Linear cumulative value. Points are sorted (time, count).

    Before the first point the value is 0. At a point it is that count.
    Between points it eases toward the next count, which is what makes the
    bars grow instead of jumping on each first.
    """
    if not points or time < points[0][0]:
        return 0.0
    if time >= points[-1][0]:
        return float(points[-1][1])
    lo = 0
    hi = len(points) - 1
    while lo + 1 < hi:
        mid = (lo + hi) // 2
        if points[mid][0] <= time:
            lo = mid
        else:
            hi = mid
    while lo + 1 < len(points) and points[lo + 1][0] <= time:
        lo += 1
    t0, v0 = points[lo]
    if lo + 1 >= len(points) or t0 == time:
        return float(points[lo][1])
    t1, v1 = points[lo + 1]
    if t1 == t0:
        return float(v1)
    span = (time - t0) / (t1 - t0)
    return float(v0) + (float(v1) - float(v0)) * span


def points_from_times(times):
    ordered = sorted(float(t) for t in times)
    if not ordered:
        return []
    grouped = []
    for t in ordered:
        if grouped and grouped[-1][0] == t:
            grouped[-1][1] += 1
        else:
            grouped.append([t, 1])
    cum = 0
    points = []
    for t, count in grouped:
        cum += count
        points.append((t, float(cum)))
    return points


def with_origin(points):
    """Start at 0 just before the first first so the opening bar grows in."""
    if not points:
        return []
    cleaned = []
    for t, value in sorted((float(t), float(v)) for t, v in points):
        if cleaned and cleaned[-1][0] == t:
            cleaned[-1] = (t, value)
        else:
            cleaned.append((t, value))
    if cleaned[0][1] == 0:
        return cleaned
    span = cleaned[-1][0] - cleaned[0][0]
    lead = cleaned[0][0] - (86400.0 if span <= 0 else max(86400.0, span * 0.015))
    return [(lead, 0.0), *cleaned]


def load_users(payload):
    if isinstance(payload, dict):
        payload = payload.get("users") or payload.get("series") or payload.get("data")
    if not isinstance(payload, list) or not payload:
        raise SystemExit("Input JSON must be a non-empty list of events or series.")

    first = payload[0]
    if isinstance(first, dict) and "data" in first:
        users = []
        for index, series in enumerate(payload):
            rows = series.get("data") or []
            points = sorted(
                (parse_time(row["timesent"]), float(row["cum_count"]))
                for row in rows
                if row.get("timesent") is not None and row.get("cum_count") is not None
            )
            if not points:
                continue
            user_id = series.get("user_id") or series.get("id") or series.get("name") or index
            users.append(
                User(
                    user_id,
                    series.get("name") or series.get("user_name") or user_id,
                    series.get("avatar"),
                    points,
                )
            )
        return users

    buckets = defaultdict(lambda: {"name": None, "avatar": None, "times": []})
    for index, event in enumerate(payload):
        user_id = str(event.get("user_id") or event.get("id") or event.get("name") or index)
        bucket = buckets[user_id]
        bucket["name"] = bucket["name"] or event.get("name") or event.get("user_name") or user_id
        bucket["avatar"] = bucket["avatar"] or event.get("avatar")
        if event.get("timesent") is None:
            continue
        bucket["times"].append(parse_time(event["timesent"]))

    users = []
    for user_id, bucket in buckets.items():
        points = points_from_times(bucket["times"])
        if not points:
            continue
        users.append(User(user_id, bucket["name"], bucket["avatar"], points))
    return users


def load_json(path):
    with open(path, encoding="utf-8") as handle:
        return load_users(json.load(handle))


def load_env_file(path):
    env = {}
    for raw in Path(path).read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip("'\"")
    return env


def load_postgres(env_path):
    try:
        import psycopg
    except ImportError as exc:
        raise SystemExit(
            "Postgres mode needs psycopg. Install tools/firsts-race/requirements.txt."
        ) from exc

    env = load_env_file(env_path)
    host_raw = env.get("SQL_HOST") or "localhost"
    host, _, port = host_raw.partition(":")
    try:
        connection = psycopg.connect(
            host=host or "localhost",
            port=int(port or 5432),
            user=env.get("SQL_USER") or "",
            password=env.get("SQL_PASSWORD") or "",
            dbname=env.get("SQL_DATABASE") or "",
            connect_timeout=10,
        )
    except Exception as exc:
        raise SystemExit(f"Could not connect to Postgres: {exc}") from exc

    sql = """
        SELECT
            m.id AS user_id,
            COALESCE(NULLIF(BTRIM(m.display_name), ''), m.user_name) AS name,
            m.avatar AS avatar,
            EXTRACT(EPOCH FROM f.timesent)::double precision AS timesent
        FROM firstlist_id f
        JOIN members m ON f.user_id = m.id
        WHERE f.timesent IS NOT NULL
        ORDER BY f.timesent ASC
    """
    with connection:
        rows = connection.execute(sql).fetchall()
    events = [
        {
            "user_id": row[0],
            "name": row[1],
            "avatar": row[2],
            "timesent": row[3],
        }
        for row in rows
    ]
    return load_users(events)


def demo_users():
    """A short history where the lead changes hands: Ada, then Bea, then Cam."""
    origin = 1_700_000_000
    day = 86400

    def at(*days):
        return [origin + d * day for d in days]

    roster = [
        ("ada", "Ada", at(0, 3, 8, 14, 22, 35)),
        ("bea", "Bea", at(5, 12, 18, 25, 32, 40, 48, 56, 64, 72)),
        ("cam", "Cam", at(40, 46, 50, 54, 58, 62, 66, 70, 74, 78, 82, 86, 90)),
        ("dee", "Dee", at(2, 20, 45, 70)),
        ("eli", "Eli", at(9, 28, 47, 68, 88)),
        ("faye", "Faye", at(15, 55, 85)),
        ("gus", "Gus", at(6, 16, 30, 44, 60, 76)),
        ("hana", "Hana", at(11, 66)),
    ]
    users = []
    for user_id, name, times in roster:
        users.append(User(user_id, name, None, points_from_times(times)))
    return users


def time_bounds(users):
    start = min(u.points[0][0] for u in users)
    end = max(u.points[-1][0] for u in users)
    if end <= start:
        end = start + 1
    return start, end


def assign_colors(users):
    ranked = sorted(users, key=lambda u: (-u.total, u.name))
    for index, user in enumerate(ranked):
        user.color = PALETTE[index % len(PALETTE)]
    return ranked


def font(weight, size):
    for path in FONT_CANDIDATES[weight]:
        if Path(path).is_file():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default(size=size)


def avatar_url(user):
    avatar = user.avatar
    if not avatar:
        return None
    text = str(avatar)
    if text.startswith(("http://", "https://", "file://")) or Path(text).is_file():
        return text
    ext = "gif" if text.startswith("a_") else "png"
    return f"https://cdn.discordapp.com/avatars/{user.user_id}/{text}.{ext}?size=128"


def initials_icon(user, size, label_font):
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.ellipse((0, 0, size - 1, size - 1), fill=user.color + (255,))
    text = initials(user.name)
    box = draw.textbbox((0, 0), text, font=label_font)
    tw, th = box[2] - box[0], box[3] - box[1]
    draw.text(
        ((size - tw) / 2 - box[0], (size - th) / 2 - box[1]),
        text,
        font=label_font,
        fill=(255, 255, 255, 255),
    )
    return image


def circle_crop(image, size):
    fitted = ImageOps.fit(image.convert("RGBA"), (size, size), method=Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    fitted.putalpha(mask)
    return fitted


def load_icon(user, size, label_font):
    source = avatar_url(user)
    if not source:
        return initials_icon(user, size, label_font)
    try:
        if source.startswith("file://"):
            image = Image.open(source[7:])
        elif Path(source).is_file():
            image = Image.open(source)
        else:
            request = urllib.request.Request(source, headers={"User-Agent": "dinkboard-firsts-race"})
            with urllib.request.urlopen(request, timeout=12) as response:
                image = Image.open(response)
                image.load()
        return circle_crop(image, size)
    except Exception as exc:
        print(f"Avatar skipped for {user.name}: {exc}", file=sys.stderr)
        return initials_icon(user, size, label_font)


def prepare_icons(users, size):
    label_font = font("semibold", max(12, int(size * 0.4)))
    for user in users:
        user.icon = load_icon(user, size, label_font)


def ellipsize(draw, text, face, max_width):
    if draw.textlength(text, font=face) <= max_width:
        return text
    trimmed = text
    while trimmed and draw.textlength(trimmed + "…", font=face) > max_width:
        trimmed = trimmed[:-1]
    return (trimmed + "…") if trimmed else "…"


def format_race_date(time, span):
    moment = datetime.fromtimestamp(time, tz=timezone.utc)
    if span < 120 * 86400:
        return moment.strftime("%b %d, %Y")
    return moment.strftime("%b %Y")


def open_encoder(size, fps, output):
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel",
        "error",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{size[0]}x{size[1]}",
        "-r",
        str(fps),
        "-i",
        "pipe:0",
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(output),
    ]
    try:
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    except FileNotFoundError as exc:
        raise SystemExit("ffmpeg is required and was not found on PATH.") from exc
    return proc, output


def render_frames(users, args):
    start, end = time_bounds(users)
    span = end - start
    race_frames = max(2, int(args.seconds * args.fps))
    hold_frames = max(0, int(args.hold * args.fps))
    times = [start + span * i / (race_frames - 1) for i in range(race_frames)]
    times.extend([end] * hold_frames)

    width, height = args.width, args.height
    top_n = max(1, args.top)
    margin_top = 92
    margin_bottom = 28
    bar_left = 292
    bar_right = 108
    row_h = (height - margin_top - margin_bottom) / top_n
    bar_h = max(18, int(row_h * 0.62))
    icon_size = bar_h
    prepare_icons(users, icon_size)

    title_font = font("semibold", 32)
    sub_font = font("medium", 16)
    name_font = font("medium", 20 if top_n <= 12 else 16)
    value_font = font("semibold", 20 if top_n <= 12 else 16)
    date_font = font("semibold", 64)

    rank_state = {}
    scale = 1.0
    dt = 1.0 / args.fps
    ease = 1 - math.exp(-dt / 0.22)
    proc, output = open_encoder((width, height), args.fps, args.output)
    assert proc.stdin is not None

    for index, time in enumerate(times):
        values = {user.user_id: value_at(user.points, time) for user in users}
        ranked = sorted(
            (user for user in users if values[user.user_id] > 0.05),
            key=lambda user: (-values[user.user_id], user.name),
        )
        targets = {}
        for place, user in enumerate(ranked):
            targets[user.user_id] = place if place < top_n else top_n + min(1.5, (place - top_n) * 0.2)

        leader = values[ranked[0].user_id] if ranked else 1.0
        if index == 0:
            rank_state = dict(targets)
            scale = max(leader, 1.0)
        else:
            for user_id, target in targets.items():
                current = rank_state.get(user_id, float(top_n))
                rank_state[user_id] = current + (target - current) * ease
            scale = scale + (max(leader, 1.0) - scale) * ease

        image = Image.new("RGB", (width, height), BG)
        draw = ImageDraw.Draw(image)
        date_text = format_race_date(time, span)
        date_w = draw.textlength(date_text, font=date_font)
        draw.text((width - 36 - date_w, height - 118), date_text, font=date_font, fill=DATE)
        draw.text((28, 22), "Firsts", font=title_font, fill=TITLE)
        draw.text((28, 58), "Cumulative count", font=sub_font, fill=MUTED)

        visible = []
        for user in users:
            slot = rank_state.get(user.user_id)
            if slot is None or values[user.user_id] <= 0.05:
                continue
            y = margin_top + slot * row_h + (row_h - bar_h) / 2
            chart_bottom = height - 16
            if y > chart_bottom - bar_h * 0.55 or y + bar_h < margin_top - bar_h:
                continue
            visible.append((slot, y, user))
        visible.sort(key=lambda item: -item[0])

        bar_max = width - bar_left - bar_right
        for _slot, y, user in visible:
            value = values[user.user_id]
            bar_w = max(0.0, (value / scale) * bar_max)
            y0 = int(round(y))
            draw.rounded_rectangle(
                [bar_left, y0, bar_left + max(bar_w, 2), y0 + bar_h],
                radius=bar_h // 2,
                fill=user.color,
            )
            icon_x = bar_left - icon_size - 12
            image.paste(user.icon, (icon_x, y0), user.icon)
            name = ellipsize(draw, user.name, name_font, icon_x - 28)
            name_w = draw.textlength(name, font=name_font)
            name_box = draw.textbbox((0, 0), name, font=name_font)
            name_h = name_box[3] - name_box[1]
            draw.text(
                (icon_x - 12 - name_w, y0 + (bar_h - name_h) / 2 - name_box[1]),
                name,
                font=name_font,
                fill=TITLE,
            )
            label = str(int(round(value)))
            label_w = draw.textlength(label, font=value_font)
            label_box = draw.textbbox((0, 0), label, font=value_font)
            label_h = label_box[3] - label_box[1]
            label_x = bar_left + bar_w + 12
            label_fill = VALUE
            if label_x + label_w > width - 16:
                label_x = bar_left + bar_w - label_w - 14
                label_fill = (18, 18, 24)
            draw.text(
                (label_x, y0 + (bar_h - label_h) / 2 - label_box[1]),
                label,
                font=value_font,
                fill=label_fill,
            )

        proc.stdin.write(image.tobytes())
        if index % args.fps == 0:
            print(f"frame {index + 1}/{len(times)}", file=sys.stderr)

    proc.stdin.close()
    code = proc.wait()
    if code != 0:
        raise SystemExit(f"ffmpeg exited {code}")
    return output


def self_test():
    points = points_from_times([100, 100, 300])
    assert points == [(100.0, 2.0), (300.0, 3.0)]
    assert value_at(points, 100) == 2
    assert value_at(points, 200) == 2.5
    assert value_at(points, 300) == 3
    assert value_at(points, 50) == 0
    assert value_at(points, 900) == 3
    grown = with_origin(points)
    assert grown[0][1] == 0
    assert value_at(grown, 100) == 2

    users = load_users(
        [
            {"user_id": "a", "name": "Ada :wave:", "timesent": 10},
            {"user_id": "a", "name": "Ada", "timesent": 30},
            {"user_id": "b", "name": "Bea", "avatar": "abc", "timesent": 20},
        ]
    )
    by_id = {user.user_id: user for user in users}
    assert by_id["a"].name == "Ada"
    assert value_at(by_id["a"].points, 30) == 2
    assert value_at(by_id["b"].points, 25) == 1
    assert avatar_url(by_id["b"]) == "https://cdn.discordapp.com/avatars/b/abc.png?size=128"

    series = load_users(
        [
            {"name": "Cam", "user_id": "c", "data": [{"timesent": 5, "cum_count": 1}, {"timesent": 8, "cum_count": 2}]},
        ]
    )
    assert value_at(series[0].points, 5) == 1
    assert value_at(series[0].points, 8) == 2
    assert value_at(series[0].points, 4) == 0

    demo = demo_users()
    origin = 1_700_000_000
    day = 86400
    scores = {user.user_id: value_at(user.points, origin + 20 * day) for user in demo}
    assert scores["ada"] > scores["bea"] > scores["cam"]
    scores = {user.user_id: value_at(user.points, origin + 50 * day) for user in demo}
    assert scores["bea"] > scores["ada"]
    scores = {user.user_id: value_at(user.points, origin + 95 * day) for user in demo}
    assert scores["cam"] > scores["bea"] > scores["ada"]

    swatch = Image.new("RGB", (24, 24), (220, 30, 30))
    swatch_path = Path("/tmp/firsts-race-swatch.png")
    swatch.save(swatch_path)
    pictured = User("9", "Ada", str(swatch_path), [(1, 1.0)])
    icon = load_icon(pictured, 32, font("semibold", 12))
    assert icon.size == (32, 32)
    assert icon.getpixel((16, 16))[0] > 200
    assert icon.getpixel((0, 0))[3] == 0
    print("self-test ok")


def parse_args(argv):
    parser = argparse.ArgumentParser(
        description="Render a cumulative firsts bar-chart race to an MP4.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--demo", action="store_true", help="Render a built-in sample race")
    source.add_argument("--input", type=Path, help="Events or cumcount JSON")
    source.add_argument("--env", type=Path, help="server/.env with SQL_* Postgres settings")
    parser.add_argument("-o", "--output", type=Path, default=Path("firsts-race.mp4"))
    parser.add_argument("--top", type=int, default=10, help="Bars on screen (default 10)")
    parser.add_argument("--seconds", type=float, default=24, help="Race length before the hold")
    parser.add_argument("--hold", type=float, default=1.5, help="Seconds to hold the final frame")
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--self-test", action="store_true", help="Check scoring math and exit")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv if argv is not None else sys.argv[1:])
    if args.self_test:
        self_test()
        return 0
    if args.demo:
        users = demo_users()
    elif args.input:
        users = load_json(args.input)
    elif args.env:
        users = load_postgres(args.env)
    else:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    users = [user for user in users if user.points]
    if not users:
        raise SystemExit("No firsts to chart.")
    args.width = max(2, args.width - (args.width % 2))
    args.height = max(2, args.height - (args.height % 2))
    assign_colors(users)
    for user in users:
        user.points = with_origin(user.points)
    print(f"{len(users)} users, top {args.top}, {args.seconds:.1f}s + {args.hold:.1f}s hold", file=sys.stderr)
    path = render_frames(users, args)
    print(path.resolve())
    return 0


if __name__ == "__main__":
    sys.exit(main())

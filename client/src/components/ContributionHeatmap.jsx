import React, { useMemo, useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});
const FULL_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function parseUTC(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatUTC(date) {
  return date.toISOString().slice(0, 10);
}

function addDaysUTC(date, n) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + n);
  return next;
}

/** Sunday-start week index matching GitHub's calendar. */
function sundayWeekStart(date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

function levelForCount(count, max) {
  if (!count || count <= 0) return 0;
  if (max <= 1) return 1;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function buildGrid(startDate, endDate, countByDate) {
  const start = parseUTC(startDate);
  const end = parseUTC(endDate);
  const gridStart = sundayWeekStart(start);
  const weeks = [];
  let cursor = new Date(gridStart);

  while (cursor <= end || cursor.getUTCDay() !== 0 || weeks.length === 0) {
    const week = [];
    for (let dow = 0; dow < 7; dow += 1) {
      const key = formatUTC(cursor);
      const inRange = cursor >= start && cursor <= end;
      const count = inRange ? countByDate.get(key) || 0 : null;
      week.push({
        date: key,
        count,
        inRange,
        month: cursor.getUTCMonth(),
        year: cursor.getUTCFullYear(),
      });
      cursor = addDaysUTC(cursor, 1);
    }
    weeks.push(week);
    if (cursor > end && cursor.getUTCDay() === 0) break;
    if (weeks.length > 60) break;
  }

  return weeks;
}

function monthLabels(weeks) {
  const labels = [];
  let prev = null;
  weeks.forEach((week, wi) => {
    const firstInRange = week.find((d) => d.inRange);
    if (!firstInRange) return;
    const key = `${firstInRange.year}-${firstInRange.month}`;
    if (key !== prev) {
      labels.push({
        label: MONTH_FMT.format(parseUTC(firstInRange.date)),
        weekIndex: wi,
      });
      prev = key;
    }
  });
  return labels;
}

/**
 * GitHub-style contribution calendar.
 * `data` is a sparse array of `{ date: 'YYYY-MM-DD', messages: number }`.
 */
const ContributionHeatmap = ({ data = [], startDate, endDate }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [hover, setHover] = useState(null);

  const countByDate = useMemo(() => {
    const map = new Map();
    (data || []).forEach((row) => {
      map.set(row.date, Number(row.messages) || 0);
    });
    return map;
  }, [data]);

  const maxCount = useMemo(() => {
    let max = 0;
    countByDate.forEach((v) => {
      if (v > max) max = v;
    });
    return max;
  }, [countByDate]);

  const weeks = useMemo(() => {
    if (!startDate || !endDate) return [];
    return buildGrid(startDate, endDate, countByDate);
  }, [startDate, endDate, countByDate]);

  const labels = useMemo(() => monthLabels(weeks), [weeks]);

  const colors = useMemo(() => {
    const empty = isDark ? "#161b22" : "#ebedf0";
    const border = isDark ? "rgba(255,255,255,0.06)" : "rgba(27,31,35,0.06)";
    return {
      empty,
      border,
      levels: isDark
        ? [empty, "#0e4429", "#006d32", "#26a641", "#39d353"]
        : [empty, "#9be9a8", "#40c463", "#30a14e", "#216e39"],
    };
  }, [isDark]);

  const total = useMemo(() => {
    let sum = 0;
    countByDate.forEach((v) => {
      sum += v;
    });
    return sum;
  }, [countByDate]);

  const width = weeks.length * STEP;
  const height = 7 * STEP;
  const labelWidth = 28;
  const monthHeight = 18;

  if (!startDate || !endDate || weeks.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No activity range available
      </Typography>
    );
  }

  const hoverTitle = hover
    ? hover.count === 1
      ? `1 message on ${FULL_FMT.format(parseUTC(hover.date))}`
      : `${hover.count} messages on ${FULL_FMT.format(parseUTC(hover.date))}`
    : null;

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        <Box component="span" fontWeight={600} color="text.primary">
          {total.toLocaleString()}
        </Box>{" "}
        messages in this period
      </Typography>

      <Box
        sx={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "auto",
          overflowY: "hidden",
          overscrollBehaviorX: "contain",
          WebkitOverflowScrolling: "touch",
          pb: 0.5,
        }}
      >
        <Box
          sx={{
            width: width + labelWidth + 8,
            minWidth: width + labelWidth + 8,
            display: "block",
          }}
        >
          <Box
            sx={{
              position: "relative",
              height: monthHeight,
              ml: `${labelWidth}px`,
              mb: 0.25,
            }}
          >
            {labels.map((m) => (
              <Typography
                key={`${m.label}-${m.weekIndex}`}
                variant="caption"
                color="text.secondary"
                sx={{
                  position: "absolute",
                  left: m.weekIndex * STEP,
                  lineHeight: 1,
                  fontSize: 10,
                }}
              >
                {m.label}
              </Typography>
            ))}
          </Box>

          <Box display="flex">
            <Box
              sx={{
                width: labelWidth,
                height,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                pr: 0.5,
              }}
            >
              {DAY_LABELS.map((label, i) => (
                <Typography
                  key={i}
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    height: CELL,
                    fontSize: 9,
                    lineHeight: `${CELL}px`,
                    textAlign: "right",
                    visibility: label ? "visible" : "hidden",
                  }}
                >
                  {label || "·"}
                </Typography>
              ))}
            </Box>

            <Box position="relative">
              <Box
                component="svg"
                width={width}
                height={height}
                role="img"
                aria-label="Message contribution calendar"
                onMouseLeave={() => setHover(null)}
              >
                {weeks.map((week, wi) =>
                  week.map((day, di) => {
                    if (!day.inRange) return null;
                    const level = levelForCount(day.count, maxCount);
                    return (
                      <rect
                        key={day.date}
                        x={wi * STEP}
                        y={di * STEP}
                        width={CELL}
                        height={CELL}
                        rx={2}
                        ry={2}
                        fill={colors.levels[level]}
                        stroke={colors.border}
                        strokeWidth={1}
                        style={{ cursor: "default" }}
                        onMouseEnter={() => setHover(day)}
                      >
                        <title>
                          {day.count === 1
                            ? `1 message on ${FULL_FMT.format(parseUTC(day.date))}`
                            : `${day.count} messages on ${FULL_FMT.format(parseUTC(day.date))}`}
                        </title>
                      </rect>
                    );
                  })
                )}
              </Box>
              {hoverTitle && (
                <Typography
                  variant="caption"
                  sx={{
                    position: "absolute",
                    left: 0,
                    bottom: -22,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: theme.palette.background.alt,
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: theme.customShadows.card,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                >
                  {hoverTitle}
                </Typography>
              )}
            </Box>
          </Box>

          <Box
            display="flex"
            alignItems="center"
            justifyContent="flex-end"
            gap={0.5}
            mt={3.5}
          >
            <Typography variant="caption" color="text.secondary">
              Less
            </Typography>
            {colors.levels.map((c, i) => (
              <Box
                key={i}
                sx={{
                  width: CELL,
                  height: CELL,
                  borderRadius: "2px",
                  bgcolor: c,
                  border: `1px solid ${colors.border}`,
                }}
              />
            ))}
            <Typography variant="caption" color="text.secondary">
              More
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ContributionHeatmap;

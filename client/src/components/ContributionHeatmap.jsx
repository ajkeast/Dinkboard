import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";

const BASE_CELL = 11;
const BASE_GAP = 3;
const BASE_STEP = BASE_CELL + BASE_GAP;
/** Floor so cells stay readable; below this we allow horizontal scroll. */
const MIN_CELL = 7;
const MIN_GAP = 2;
const MIN_STEP = MIN_CELL + MIN_GAP;
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

function fitMetrics(weekCount, availableWidth, labelWidth) {
  const gridBudget = Math.max(0, availableWidth - labelWidth);

  if (!weekCount || gridBudget <= 0) {
    return { cell: BASE_CELL, gap: BASE_GAP, step: BASE_STEP, fits: true };
  }

  // Fill the container width (grow or shrink) so leftover margin isn't wasted.
  const step = gridBudget / weekCount;
  if (step < MIN_STEP) {
    return { cell: MIN_CELL, gap: MIN_GAP, step: MIN_STEP, fits: false };
  }

  const gap = Math.max(MIN_GAP, step * (BASE_GAP / BASE_STEP));
  const cell = step - gap;
  return { cell, gap, step, fits: true };
}

/**
 * GitHub-style contribution calendar.
 * `data` is a sparse array of `{ date: 'YYYY-MM-DD', messages: number }`.
 */
const ContributionHeatmap = ({ data = [], startDate, endDate }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  // { date, count, x, y } — x/y are viewport coords for a fixed tooltip
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

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

  const labelWidth = 28;
  const monthHeight = 18;
  const { cell, step, fits } = useMemo(
    () => fitMetrics(weeks.length, containerWidth, labelWidth),
    [weeks.length, containerWidth]
  );

  const width = weeks.length * step;
  const height = 7 * step;

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

  const updateHover = (day, event) => {
    setHover({
      ...day,
      x: event.clientX,
      y: event.clientY,
    });
  };

  return (
    <Box
      ref={containerRef}
      sx={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
    >
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
          overflowX: fits ? "visible" : "auto",
          overflowY: "hidden",
          overscrollBehaviorX: "contain",
          WebkitOverflowScrolling: "touch",
          pb: 0.5,
        }}
      >
        <Box
          sx={{
            width: fits ? "100%" : width + labelWidth,
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
                  left: m.weekIndex * step,
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
                position: "relative",
                width: labelWidth,
                height,
                pr: 0.5,
                flexShrink: 0,
              }}
            >
              {DAY_LABELS.map((label, i) => (
                <Typography
                  key={i}
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    position: "absolute",
                    top: i * step,
                    right: 4,
                    height: cell,
                    fontSize: 9,
                    lineHeight: `${cell}px`,
                    textAlign: "right",
                    visibility: label ? "visible" : "hidden",
                  }}
                >
                  {label || "·"}
                </Typography>
              ))}
            </Box>

            <Box
              component="svg"
              width={width}
              height={height}
              role="img"
              aria-label="Message contribution calendar"
              onMouseLeave={() => setHover(null)}
              sx={{ display: "block", flexShrink: 0 }}
            >
              {weeks.map((week, wi) =>
                week.map((day, di) => {
                  if (!day.inRange) return null;
                  const level = levelForCount(day.count, maxCount);
                  return (
                    <rect
                      key={day.date}
                      x={wi * step}
                      y={di * step}
                      width={cell}
                      height={cell}
                      rx={2}
                      ry={2}
                      fill={colors.levels[level]}
                      stroke={colors.border}
                      strokeWidth={1}
                      style={{ cursor: "default" }}
                      onMouseEnter={(e) => updateHover(day, e)}
                      onMouseMove={(e) => updateHover(day, e)}
                    />
                  );
                })
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {hoverTitle && (
        <Typography
          variant="caption"
          sx={{
            position: "fixed",
            left: hover.x,
            top: hover.y + 16,
            transform: "translateX(-50%)",
            px: 0.75,
            py: 0.25,
            borderRadius: 1,
            bgcolor: theme.palette.background.alt,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.customShadows.card,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: theme.zIndex.tooltip,
          }}
        >
          {hoverTitle}
        </Typography>
      )}

      <Box
        display="flex"
        alignItems="center"
        justifyContent="flex-start"
        gap={0.5}
        mt={1}
      >
        <Typography variant="caption" color="text.secondary">
          Less
        </Typography>
        {colors.levels.map((c, i) => (
          <Box
            key={i}
            sx={{
              width: BASE_CELL,
              height: BASE_CELL,
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
  );
};

export default ContributionHeatmap;

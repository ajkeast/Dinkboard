/**
 * Shared Recharts axis / grid / tooltip styling.
 * Modern defaults: sparse horizontal grid, no tick marks, muted labels, consistent margins.
 */

export const formatCompact = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(n));
};

/** Distinct series colors tuned for dark + light chart backgrounds. */
export const SERIES_COLORS = [
  "#8e7bda",
  "#22a06b",
  "#d97706",
  "#3b82f6",
  "#db2777",
  "#0891b2",
  "#ca8a04",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#60a5fa",
  "#fbbf24",
];

export function getSeriesColor(index) {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

/** Strip Discord emoji shortcodes and collapse whitespace for chart labels. */
export function formatSeriesLabel(name) {
  if (name == null) return "";
  return String(name)
    .replace(/:[a-zA-Z0-9_+]+:/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split legend items into columns in reading order down each column
 * (first half in column 1, second half in column 2, …).
 */
export function splitLegendColumns(items, columns = 2) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return [];
  const colCount = Math.max(1, columns);
  if (colCount === 1) return [list];
  const size = Math.ceil(list.length / colCount);
  return Array.from({ length: colCount }, (_, i) =>
    list.slice(i * size, i * size + size)
  ).filter((col) => col.length > 0);
}

export function getChartTheme(theme) {
  const isDark = theme.palette.mode === "dark";
  const tickFill = theme.palette.text.secondary;
  const gridStroke = isDark
    ? "rgba(255, 255, 255, 0.06)"
    : "rgba(0, 0, 0, 0.06)";
  const axisStroke = isDark
    ? "rgba(255, 255, 255, 0.12)"
    : "rgba(0, 0, 0, 0.12)";

  const tick = {
    fontSize: 11,
    fill: tickFill,
    fontFamily: theme.typography.fontFamily,
  };

  return {
    margin: { top: 12, right: 16, left: 4, bottom: 4 },
    /** Horizontal bar charts need room for category labels. */
    marginVertical: { top: 8, right: 16, left: 8, bottom: 8 },
    gridStroke,
    axisStroke,
    tick,
    /** Cartesian grid: horizontal rules only, no dash clutter. */
    grid: {
      stroke: gridStroke,
      strokeDasharray: "0",
      vertical: false,
      horizontal: true,
    },
    /** Vertical layout (category on Y): vertical rules only. */
    gridVerticalLayout: {
      stroke: gridStroke,
      strokeDasharray: "0",
      vertical: true,
      horizontal: false,
    },
    xAxis: {
      tick,
      axisLine: { stroke: axisStroke },
      tickLine: false,
      minTickGap: 40,
      interval: "preserveStartEnd",
      height: 36,
      padding: { left: 4, right: 4 },
    },
    /** Rotated labels when density requires it. */
    xAxisAngled: {
      tick,
      axisLine: { stroke: axisStroke },
      tickLine: false,
      minTickGap: 48,
      interval: "preserveStartEnd",
      angle: -30,
      textAnchor: "end",
      height: 52,
      padding: { left: 4, right: 4 },
    },
    yAxis: {
      tick,
      axisLine: false,
      tickLine: false,
      width: 48,
      tickFormatter: formatCompact,
    },
    yAxisCategory: {
      tick: { ...tick, fill: theme.palette.text.primary },
      axisLine: false,
      tickLine: false,
      width: 112,
    },
    tooltip: {
      contentStyle: {
        backgroundColor: theme.palette.background.alt,
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.customShadows?.card ?? "none",
        fontSize: 12,
        color: theme.palette.text.primary,
      },
      itemStyle: { fontSize: 12 },
      labelStyle: {
        fontSize: 12,
        fontWeight: 600,
        color: theme.palette.text.primary,
      },
    },
    legend: {
      wrapperStyle: {
        fontSize: 11,
        color: tickFill,
        paddingTop: 8,
        maxHeight: 72,
        overflowY: "auto",
      },
      iconSize: 8,
      iconType: "square",
    },
    series: {
      strokeWidth: 2,
      animationDuration: 300,
    },
    barSize: undefined,
    barCategoryGap: "18%",
  };
}

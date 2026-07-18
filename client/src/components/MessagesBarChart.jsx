import React, { useMemo, useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import QueryState from "./QueryState";
import {
  formatCompact,
  formatSeriesLabel,
  getChartTheme,
  getSeriesColor,
  splitLegendColumns,
} from "utils/chartTheme";

const OTHER_KEY = "Other";
const TOP_MEMBERS = 5;

/** Rank members by total volume; keep top N and roll the rest into Other. */
export function toTopMemberStacks(rows, topN = TOP_MEMBERS) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { data: [], memberKeys: [], totals: new Map() };
  }

  const totals = new Map();
  rows.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (key === "month") return;
      totals.set(key, (totals.get(key) || 0) + (Number(value) || 0));
    });
  });

  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const topKeys = ranked.slice(0, topN).map(([name]) => name);
  const topSet = new Set(topKeys);
  const hasOther = ranked.length > topKeys.length;
  const memberKeys = hasOther ? [...topKeys, OTHER_KEY] : topKeys;

  const stackTotals = new Map(topKeys.map((k) => [k, totals.get(k) || 0]));
  if (hasOther) {
    const otherTotal = ranked
      .slice(topN)
      .reduce((sum, [, n]) => sum + n, 0);
    stackTotals.set(OTHER_KEY, otherTotal);
  }

  const data = rows.map((row) => {
    const next = { month: row.month };
    let other = 0;
    Object.entries(row).forEach(([key, value]) => {
      if (key === "month") return;
      const n = Number(value) || 0;
      if (topSet.has(key)) next[key] = n;
      else other += n;
    });
    if (hasOther) next[OTHER_KEY] = other;
    next._total = memberKeys.reduce(
      (sum, key) => sum + (Number(next[key]) || 0),
      0
    );
    return next;
  });

  return { data, memberKeys, totals: stackTotals };
}

const memberColor = (key, index, theme) =>
  key === OTHER_KEY ? theme.palette.grey[500] : getSeriesColor(index);

const MessagesTooltip = ({
  active,
  payload,
  label,
  theme,
  chart,
  memberKeys,
}) => {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  const rows = memberKeys
    .map((key, index) => {
      const entry = payload.find((p) => p.dataKey === key);
      const value = Number(entry?.value ?? point?.[key]) || 0;
      return {
        key,
        value,
        color: entry?.color || memberColor(key, index, theme),
      };
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!rows.length) return null;

  const total = rows.reduce((sum, r) => sum + r.value, 0);

  return (
    <Box
      sx={{
        ...chart.tooltip.contentStyle,
        px: 1.25,
        py: 1,
        minWidth: 168,
        maxWidth: 260,
      }}
    >
      <Typography
        sx={{
          ...chart.tooltip.labelStyle,
          mb: 0.5,
          display: "block",
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          mb: 0.75,
          color: theme.palette.text.disabled,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatCompact(total)} messages
      </Typography>
      {rows.map((entry) => (
        <Box
          key={entry.key}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap={1.5}
          sx={{ py: 0.2 }}
        >
          <Box display="flex" alignItems="center" gap={0.75} minWidth={0}>
            <Box
              width={8}
              height={8}
              borderRadius="1px"
              flexShrink={0}
              bgcolor={entry.color}
            />
            <Typography
              variant="caption"
              noWrap
              title={entry.key}
              sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
            >
              {formatSeriesLabel(entry.key) || entry.key}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.primary,
              fontSize: 12,
              fontWeight: 600,
              flexShrink: 0,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCompact(entry.value)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const LegendRow = ({
  item,
  isHidden,
  isActive,
  theme,
  onToggle,
  onHover,
  onLeave,
}) => (
  <Box
    component="li"
    onClick={onToggle}
    onMouseEnter={onHover}
    onMouseLeave={onLeave}
    title={`${item.label} — click to ${isHidden ? "show" : "hide"}`}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 0.75,
      minWidth: 0,
      px: 0.75,
      py: 0.45,
      borderRadius: `${theme.shape.borderRadius}px`,
      cursor: "pointer",
      opacity: isHidden ? 0.4 : 1,
      bgcolor: isActive
        ? theme.palette.mode === "dark"
          ? "rgba(255,255,255,0.06)"
          : "rgba(0,0,0,0.04)"
        : "transparent",
      transition: "background-color 120ms ease, opacity 120ms ease",
      "&:hover": {
        bgcolor:
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.04)",
      },
    }}
  >
    <Box
      width={10}
      height={3}
      borderRadius="1px"
      flexShrink={0}
      bgcolor={item.color}
      sx={{ opacity: isHidden ? 0.35 : 1 }}
    />
    <Box minWidth={0} flex={1}>
      <Typography
        variant="caption"
        noWrap
        sx={{
          display: "block",
          fontSize: 12,
          lineHeight: 1.25,
          color: isHidden
            ? theme.palette.text.disabled
            : theme.palette.text.secondary,
          textDecoration: isHidden ? "line-through" : "none",
        }}
      >
        {item.label}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontSize: 10,
          color: theme.palette.text.disabled,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {Math.round(item.share * 100)}%
      </Typography>
    </Box>
    <Typography
      variant="caption"
      sx={{
        fontSize: 11,
        color: theme.palette.text.disabled,
        flexShrink: 0,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {Math.round(item.total).toLocaleString("en-US")}
    </Typography>
  </Box>
);

const MessagesBarChart = ({ data, isLoading, error, onRetry }) => {
  const theme = useTheme();
  const chart = getChartTheme(theme);
  const [hovered, setHovered] = useState(null);
  const [hidden, setHidden] = useState(() => new Set());

  const { data: chartData, memberKeys, totals } = useMemo(
    () => toTopMemberStacks(data),
    [data]
  );

  const stats = useMemo(() => {
    if (!chartData.length) {
      return {
        total: 0,
        average: 0,
        latest: 0,
        latestMonth: "",
        peak: 0,
        peakMonth: "",
      };
    }

    const monthTotals = chartData.map((row) => ({
      month: row.month,
      total: Number(row._total) || 0,
    }));
    const total = monthTotals.reduce((sum, m) => sum + m.total, 0);
    const latest = monthTotals[monthTotals.length - 1];
    const peak = monthTotals.reduce(
      (best, m) => (m.total > best.total ? m : best),
      monthTotals[0]
    );

    return {
      total,
      average: total / monthTotals.length,
      latest: latest.total,
      latestMonth: latest.month,
      peak: peak.total,
      peakMonth: peak.month,
    };
  }, [chartData]);

  const legendItems = useMemo(() => {
    const grandTotal =
      [...totals.values()].reduce((sum, n) => sum + n, 0) || 1;
    return memberKeys.map((key, index) => {
      const total = totals.get(key) || 0;
      return {
        key,
        index,
        total,
        share: total / grandTotal,
        color: memberColor(key, index, theme),
        label: formatSeriesLabel(key) || key,
      };
    });
  }, [memberKeys, totals, theme]);

  const legendColumns = useMemo(
    () => splitLegendColumns(legendItems),
    [legendItems]
  );

  const toggleSeries = (key) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const chartMargin = {
    ...chart.margin,
    top: 8,
    right: 12,
    bottom: 0,
  };

  const visibleKeys = memberKeys.filter((key) => !hidden.has(key));

  return (
    <QueryState
      isLoading={isLoading}
      error={error}
      isEmpty={!isLoading && chartData.length === 0}
      emptyMessage="No message data yet"
      onRetry={onRetry}
      skeletonVariant="bars"
      skeletonHeight="100%"
    >
      <Box
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        gap={{ xs: 1.5, md: 2 }}
        width="100%"
        height="100%"
        minHeight={0}
      >
        <Box flex="1 1 auto" minWidth={0} minHeight={{ xs: 260, md: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={chartMargin}
              barCategoryGap="18%"
            >
              <CartesianGrid {...chart.grid} />
              <XAxis
                dataKey="month"
                {...chart.xAxis}
                height={40}
                minTickGap={28}
              />
              <YAxis {...chart.yAxis} width={40} />
              <Tooltip
                content={
                  <MessagesTooltip
                    theme={theme}
                    chart={chart}
                    memberKeys={visibleKeys}
                  />
                }
                cursor={{
                  fill:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                }}
              />
              {memberKeys.map((key, index) => {
                const color = memberColor(key, index, theme);
                const isHidden = hidden.has(key);
                const isDimmed = hovered != null && hovered !== key;
                const isTopVisible =
                  visibleKeys.length > 0 &&
                  visibleKeys[visibleKeys.length - 1] === key;

                return (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={key}
                    stackId="a"
                    hide={isHidden}
                    fill={color}
                    fillOpacity={isHidden ? 0 : isDimmed ? 0.22 : 1}
                    radius={isTopVisible ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                    animationDuration={chart.series.animationDuration}
                    animationBegin={0}
                    onMouseEnter={() => setHovered(key)}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {legendColumns.length > 0 && (
          <Box
            sx={{
              flex: { xs: "0 0 auto", md: "0 0 300px" },
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
              minHeight: 0,
              overflow: "hidden",
              pl: { xs: 0, md: 0.5 },
              borderLeft: {
                xs: "none",
                md: `1px solid ${theme.palette.divider}`,
              },
            }}
          >
            <Box
              display="grid"
              gap={0.75}
              gridTemplateColumns="repeat(2, minmax(0, 1fr))"
              flexShrink={0}
            >
              {[
                { label: "12-mo total", value: formatCompact(stats.total) },
                { label: "Avg / month", value: formatCompact(stats.average) },
                {
                  label: stats.latestMonth || "Latest",
                  value: formatCompact(stats.latest),
                },
                {
                  label: stats.peakMonth ? `Peak · ${stats.peakMonth}` : "Peak",
                  value: formatCompact(stats.peak),
                },
              ].map((stat) => (
                <Box key={stat.label} minWidth={0}>
                  <Typography
                    variant="caption"
                    noWrap
                    title={stat.label}
                    sx={{
                      display: "block",
                      fontSize: 11,
                      color: theme.palette.text.disabled,
                      lineHeight: 1.2,
                    }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      color: theme.palette.text.primary,
                      lineHeight: 1.3,
                    }}
                  >
                    {stat.value}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box
              aria-label="Member legend"
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                alignItems: "flex-start",
                gap: 0.75,
                overflowY: "auto",
                pb: 1,
              }}
            >
              {legendColumns.map((column, colIndex) => (
                <Box
                  component="ul"
                  key={`messages-legend-col-${colIndex}`}
                  sx={{
                    listStyle: "none",
                    m: 0,
                    p: 0,
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.35,
                  }}
                >
                  {column.map((item) => (
                    <LegendRow
                      key={item.key}
                      item={item}
                      isHidden={hidden.has(item.key)}
                      isActive={hovered === item.key}
                      theme={theme}
                      onToggle={() => toggleSeries(item.key)}
                      onHover={() => setHovered(item.key)}
                      onLeave={() => setHovered(null)}
                    />
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </QueryState>
  );
};

export default MessagesBarChart;

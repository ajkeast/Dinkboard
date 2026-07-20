import React, { useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import {
  AreaChart,
  Area,
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
  splitLegendColumns,
} from "utils/chartTheme";

const formatAxisDate = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const formatTooltipDate = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const JuiceTooltip = ({ active, payload, theme, chart }) => {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  const name = formatSeriesLabel(point.user_name) || point.user_name || "Unknown";
  const juice = Number(point.juice);

  return (
    <Box
      sx={{
        ...chart.tooltip.contentStyle,
        px: 1.25,
        py: 1,
        minWidth: 160,
        maxWidth: 240,
      }}
    >
      <Typography
        sx={{
          ...chart.tooltip.labelStyle,
          mb: 0.75,
          display: "block",
        }}
      >
        {formatTooltipDate(point.eastern_timestamp)}
      </Typography>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={1.5}
        sx={{ py: 0.2 }}
      >
        <Typography
          variant="caption"
          noWrap
          title={name}
          sx={{ color: theme.palette.text.secondary, fontSize: 12, minWidth: 0 }}
        >
          {name}
        </Typography>
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
          {Number.isFinite(juice) ? formatCompact(juice) : "—"}
        </Typography>
      </Box>
    </Box>
  );
};

const JuiceAreaChart = ({ data, isLoading, error, onRetry }) => {
  const theme = useTheme();
  const chart = getChartTheme(theme);
  const stroke = theme.palette.secondary[300];
  const fill = theme.palette.secondary[500];

  const chartData = useMemo(
    () => (Array.isArray(data) ? data : []),
    [data]
  );

  const { topUsers, stats } = useMemo(() => {
    if (!chartData.length) {
      return {
        topUsers: [],
        stats: { count: 0, average: 0, latest: 0 },
      };
    }

    const totals = new Map();
    let sum = 0;

    for (const row of chartData) {
      const juice = Number(row.juice) || 0;
      sum += juice;
      const key = row.user_name || row.user_id || "Unknown";
      totals.set(key, (totals.get(key) || 0) + juice);
    }

    const topUsers = [...totals.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const latest = Number(chartData[chartData.length - 1]?.juice) || 0;

    return {
      topUsers,
      stats: {
        count: chartData.length,
        average: sum / chartData.length,
        latest,
      },
    };
  }, [chartData]);

  const chartMargin = {
    ...chart.margin,
    top: 8,
    right: 12,
    bottom: 0,
  };

  const legendColumns = useMemo(
    () =>
      splitLegendColumns(
        topUsers.map((user, index) => ({ user, index }))
      ),
    [topUsers]
  );

  return (
    <QueryState
      isLoading={isLoading}
      error={error}
      isEmpty={!isLoading && chartData.length === 0}
      emptyMessage="No juice data"
      onRetry={onRetry}
      skeletonVariant="area"
      skeletonHeight="100%"
    >
      <Box
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        gap={{ xs: 1.5, md: 2 }}
        width="100%"
        height={{ xs: "auto", md: "100%" }}
        minHeight={0}
      >
        <Box
          flex="1 1 auto"
          minWidth={0}
          height={{ xs: 260, md: "100%" }}
          minHeight={{ xs: 260, md: 0 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={chartMargin}>
              <defs>
                <linearGradient id="juiceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={fill} stopOpacity={0.4} />
                  <stop offset="70%" stopColor={fill} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={fill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...chart.grid} />
              <XAxis
                {...chart.xAxis}
                dataKey="eastern_timestamp"
                tickFormatter={formatAxisDate}
                minTickGap={56}
                height={40}
              />
              <YAxis {...chart.yAxis} width={40} />
              <Tooltip
                content={<JuiceTooltip theme={theme} chart={chart} />}
                cursor={{
                  stroke: theme.palette.divider,
                  strokeWidth: 1,
                }}
              />
              <Area
                type="monotone"
                dataKey="juice"
                name="Juice"
                stroke={stroke}
                strokeWidth={chart.series.strokeWidth}
                fillOpacity={1}
                fill="url(#juiceGrad)"
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 0,
                  fill: stroke,
                }}
                animationDuration={chart.series.animationDuration}
                animationBegin={0}
              />
            </AreaChart>
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
              gridTemplateColumns="repeat(3, minmax(0, 1fr))"
            >
              {[
                { label: "Events", value: formatCompact(stats.count) },
                { label: "Average", value: formatCompact(stats.average) },
                { label: "Latest", value: formatCompact(stats.latest) },
              ].map((stat) => (
                <Box key={stat.label} minWidth={0}>
                  <Typography
                    variant="caption"
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
              aria-label="Top juice contributors"
              sx={{
                display: "flex",
                gap: 0.75,
                maxHeight: { xs: "none", md: "100%" },
                overflowY: { xs: "visible", md: "auto" },
                minHeight: 0,
                pb: { xs: 0.5, md: 0 },
              }}
            >
              {legendColumns.map((column, colIndex) => (
                <Box
                  component="ul"
                  key={`juice-legend-col-${colIndex}`}
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
                  {column.map(({ user, index }) => {
                    const label = formatSeriesLabel(user.name) || user.name;
                    return (
                      <Box
                        component="li"
                        key={user.name}
                        title={label}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          minWidth: 0,
                          px: 0.75,
                          py: 0.45,
                          borderRadius: `${theme.shape.borderRadius}px`,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: 11,
                            width: 14,
                            flexShrink: 0,
                            color: theme.palette.text.disabled,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {index + 1}
                        </Typography>
                        <Typography
                          variant="caption"
                          noWrap
                          sx={{
                            fontSize: 12,
                            lineHeight: 1.3,
                            color: theme.palette.text.secondary,
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          {label}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: 11,
                            color: theme.palette.text.disabled,
                            flexShrink: 0,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {Math.round(user.total).toLocaleString("en-US")}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </QueryState>
  );
};

export default JuiceAreaChart;

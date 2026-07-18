import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Box, CardContent, Typography, useTheme } from "@mui/material";
import Header from "components/Header";
import DashCard from "components/DashCard";
import QueryState from "components/QueryState";
import { useGetCumCountQuery } from "state/api";
import {
  formatCompact,
  formatSeriesLabel,
  getChartTheme,
  getSeriesColor,
  splitLegendColumns,
} from "utils/chartTheme";

const formatAxisDate = (unixTime) => {
  const date = new Date(unixTime * 1000);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
};

const formatTooltipDate = (unixTime) => {
  const date = new Date(unixTime * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const seriesEndValue = (item) => {
  const last = item?.data?.[item.data.length - 1];
  return Number(last?.cum_count) || 0;
};

const FirstsTooltip = ({ active, payload, label, theme, chart }) => {
  if (!active || !payload?.length) return null;

  const rows = [...payload]
    .filter((p) => p.value != null && p.value !== "")
    .sort((a, b) => Number(b.value) - Number(a.value));

  if (!rows.length) return null;

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
        {formatTooltipDate(label)}
      </Typography>
      {rows.map((entry) => (
        <Box
          key={entry.name}
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
              title={entry.name}
              sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
            >
              {formatSeriesLabel(entry.name) || entry.name}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.primary,
              fontSize: 12,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {formatCompact(entry.value)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const Firsts = () => {
  const theme = useTheme();
  const chart = getChartTheme(theme);
  const { data, error, refetch } = useGetCumCountQuery();
  const [hovered, setHovered] = useState(null);
  const [hidden, setHidden] = useState(() => new Set());

  const showSkeleton = !Array.isArray(data) && !error;

  const series = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data
      .filter((item) => Array.isArray(item?.data) && item.data.length > 0)
      .slice()
      .sort((a, b) => seriesEndValue(b) - seriesEndValue(a));
  }, [data]);

  const { domain, xAxisTicks } = useMemo(() => {
    const allDates = series.flatMap((item) =>
      item.data.map((d) => d.timesent).filter((t) => Number.isFinite(t))
    );
    if (!allDates.length) {
      return { domain: [0, 0], xAxisTicks: [] };
    }

    const minDate = Math.min(...allDates);
    const maxDate = Math.max(...allDates);
    const tickCount = 5;
    const step = tickCount > 1 ? (maxDate - minDate) / (tickCount - 1) : 0;
    const ticks = Array.from({ length: tickCount }, (_, i) =>
      Math.round(minDate + step * i)
    );

    return { domain: [minDate, maxDate], xAxisTicks: ticks };
  }, [series]);

  const toggleSeries = (name) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const chartMargin = {
    ...chart.margin,
    top: 8,
    right: 12,
    bottom: 0,
  };

  const legendColumns = useMemo(
    () =>
      splitLegendColumns(
        series.map((item, index) => ({ item, index }))
      ),
    [series]
  );

  return (
    <Box height={{ xs: "70vh", md: "80vh" }} width="100%">
      <Header title="Firsts" subtitle="Cumulative count of firsts" />
      <DashCard
        sx={{
          mt: 1.5,
          height: "calc(100% - 64px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <CardContent
          sx={{
            flex: 1,
            minHeight: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            "&:last-child": { pb: 1.5 },
          }}
        >
          <Box flex={1} minHeight={320} width="100%" height="100%">
            <QueryState
              isLoading={showSkeleton}
              error={error}
              isEmpty={!showSkeleton && series.length === 0}
              emptyMessage="No firsts data available"
              onRetry={refetch}
              skeletonVariant="area"
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
                    <LineChart margin={chartMargin}>
                      <CartesianGrid {...chart.grid} />
                      <XAxis
                        {...chart.xAxis}
                        dataKey="timesent"
                        type="number"
                        domain={domain}
                        ticks={xAxisTicks}
                        tickFormatter={formatAxisDate}
                        allowDataOverflow
                        height={40}
                      />
                      <YAxis {...chart.yAxis} width={40} />
                      <Tooltip
                        content={
                          <FirstsTooltip theme={theme} chart={chart} />
                        }
                        cursor={{
                          stroke: theme.palette.divider,
                          strokeWidth: 1,
                        }}
                      />
                      {series.map((s, index) => {
                        const color = getSeriesColor(index);
                        const isHidden = hidden.has(s.name);
                        const isDimmed =
                          hovered != null && hovered !== s.name;
                        return (
                          <Line
                            dataKey="cum_count"
                            data={s.data}
                            name={s.name}
                            key={s.name}
                            type="monotone"
                            stroke={color}
                            strokeWidth={
                              hovered === s.name
                                ? chart.series.strokeWidth + 1
                                : chart.series.strokeWidth
                            }
                            strokeOpacity={
                              isHidden ? 0 : isDimmed ? 0.18 : 1
                            }
                            hide={isHidden}
                            dot={false}
                            activeDot={
                              isHidden
                                ? false
                                : {
                                    r: 4,
                                    strokeWidth: 0,
                                    fill: color,
                                  }
                            }
                            animationDuration={chart.series.animationDuration}
                            onMouseEnter={() => setHovered(s.name)}
                            onMouseLeave={() => setHovered(null)}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </Box>

                {legendColumns.length > 0 && (
                  <Box
                    aria-label="Series legend"
                    sx={{
                      flex: { xs: "0 0 auto", md: "0 0 300px" },
                      display: "flex",
                      gap: 0.75,
                      maxHeight: { xs: "none", md: "100%" },
                      overflowY: { xs: "visible", md: "auto" },
                      pl: { xs: 0, md: 0.5 },
                      borderLeft: {
                        xs: "none",
                        md: `1px solid ${theme.palette.divider}`,
                      },
                    }}
                  >
                    {legendColumns.map((column, colIndex) => (
                      <Box
                        component="ul"
                        key={`legend-col-${colIndex}`}
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
                        {column.map(({ item: s, index }) => {
                          const color = getSeriesColor(index);
                          const label = formatSeriesLabel(s.name) || s.name;
                          const isHidden = hidden.has(s.name);
                          const isActive = hovered === s.name;

                          return (
                            <Box
                              component="li"
                              key={s.name}
                              onClick={() => toggleSeries(s.name)}
                              onMouseEnter={() => setHovered(s.name)}
                              onMouseLeave={() => setHovered(null)}
                              title={`${label} — click to ${
                                isHidden ? "show" : "hide"
                              }`}
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
                                transition:
                                  "background-color 120ms ease, opacity 120ms ease",
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
                                bgcolor={color}
                                sx={{ opacity: isHidden ? 0.35 : 1 }}
                              />
                              <Typography
                                variant="caption"
                                noWrap
                                sx={{
                                  fontSize: 12,
                                  lineHeight: 1.3,
                                  color: isHidden
                                    ? theme.palette.text.disabled
                                    : theme.palette.text.secondary,
                                  textDecoration: isHidden
                                    ? "line-through"
                                    : "none",
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
                                {formatCompact(seriesEndValue(s))}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </QueryState>
          </Box>
        </CardContent>
      </DashCard>
    </Box>
  );
};

export default Firsts;

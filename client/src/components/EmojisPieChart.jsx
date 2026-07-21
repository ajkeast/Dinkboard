import React, { useCallback, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Box, Typography, useMediaQuery, useTheme } from "@mui/material";
import QueryState from "./QueryState";

const MOBILE_CHART_HEIGHT = 220;
const RADIAN = Math.PI / 180;
/** Hide in-slice images when a wedge is too thin to fit them cleanly. */
const MIN_SLICE_PCT_FOR_IMAGE = 6;

const COLORS = [
  "#694fce",
  "#22a06b",
  "#d97706",
  "#2563eb",
  "#db2777",
  "#0891b2",
  "#ca8a04",
  "#7c3aed",
];

const EmojiLegendIcon = ({ url, name, color, size }) => (
  <Box
    width={size}
    height={size}
    flexShrink={0}
    borderRadius={0.5}
    bgcolor={color}
    display="flex"
    alignItems="center"
    justifyContent="center"
    overflow="hidden"
  >
    {url ? (
      <Box
        component="img"
        src={url}
        alt={name}
        width={size - 4}
        height={size - 4}
        sx={{ objectFit: "contain" }}
      />
    ) : null}
  </Box>
);

const EmojisPieChart = ({ data, isLoading, error, onRetry, topN = 8 }) => {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up("sm"));
  const emojiSize = isSmUp ? 22 : 16;
  const legendIconSize = isSmUp ? 22 : 20;

  const chartData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return [...data]
      .filter((e) => (e.occurrences ?? 0) > 0)
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, topN)
      .map((e) => ({
        name: e.emoji_name,
        value: e.occurrences,
        url: e.url,
      }));
  }, [data, topN]);

  const total = useMemo(
    () => chartData.reduce((sum, e) => sum + e.value, 0),
    [chartData]
  );

  const renderSliceEmoji = useCallback(
    ({ cx, cy, midAngle, innerRadius, outerRadius, percent, url, name }) => {
      if (!url || percent * 100 < MIN_SLICE_PCT_FOR_IMAGE) return null;

      const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      const half = emojiSize / 2;

      return (
        <image
          key={`emoji-${name}`}
          href={url}
          xlinkHref={url}
          x={x - half}
          y={y - half}
          width={emojiSize}
          height={emojiSize}
          style={{ pointerEvents: "none" }}
        />
      );
    },
    [emojiSize]
  );

  // ResponsiveContainer needs a concrete pixel height on narrow screens —
  // percentage height collapses to 0 when the parent uses height: auto / flex.
  const chartHeight = isSmUp ? "100%" : MOBILE_CHART_HEIGHT;

  return (
    <QueryState
      isLoading={isLoading}
      error={error}
      isEmpty={!isLoading && chartData.length === 0}
      emptyMessage="No emoji usage data"
      onRetry={onRetry}
      skeletonVariant="pie"
      skeletonHeight={280}
    >
      <Box
        display="flex"
        alignItems={{ xs: "stretch", sm: "center" }}
        gap={{ xs: 1.5, sm: 2 }}
        height="100%"
        width="100%"
        flexDirection={{ xs: "column", sm: "row" }}
      >
        <Box
          flex="1 1 55%"
          minWidth={0}
          width="100%"
          height={chartHeight}
          minHeight={MOBILE_CHART_HEIGHT}
          flexShrink={0}
        >
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={chartData}
                innerRadius="45%"
                outerRadius="75%"
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                animationDuration={300}
                label={renderSliceEmoji}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.alt,
                  borderRadius: theme.shape.borderRadius,
                  border: `1px solid ${theme.palette.divider}`,
                }}
                formatter={(value, name) => [
                  total
                    ? `${value} (${Math.round((value / total) * 100)}%)`
                    : value,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
        <Box
          flex={{ xs: "0 0 auto", sm: "1 1 45%" }}
          display="flex"
          flexDirection={{ xs: "row", sm: "column" }}
          flexWrap={{ xs: "wrap", sm: "nowrap" }}
          justifyContent={{ xs: "center", sm: "center" }}
          gap={{ xs: 1, sm: 0.75 }}
          minWidth={0}
          width={{ xs: "100%", sm: "auto" }}
        >
          {chartData.map((entry, index) => (
            <Box
              key={entry.name}
              display="flex"
              alignItems="center"
              gap={1}
              minWidth={0}
              sx={{
                flex: { xs: "0 1 auto", sm: "0 0 auto" },
                maxWidth: { xs: "100%", sm: "none" },
                width: { xs: "calc(50% - 8px)", sm: "auto" },
              }}
            >
              <EmojiLegendIcon
                url={entry.url}
                name={entry.name}
                color={COLORS[index % COLORS.length]}
                size={legendIconSize}
              />
              <Typography
                variant="body2"
                noWrap
                title={entry.name}
                sx={{ minWidth: 0, flex: 1 }}
              >
                {entry.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flexShrink: 0 }}
              >
                {entry.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </QueryState>
  );
};

export default EmojisPieChart;

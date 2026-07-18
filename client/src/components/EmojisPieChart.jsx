import React, { useMemo } from "react";
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

const EmojisPieChart = ({ data, isLoading, error, onRetry, topN = 8 }) => {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up("sm"));

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
              <Box
                width={10}
                height={10}
                borderRadius={0}
                flexShrink={0}
                bgcolor={COLORS[index % COLORS.length]}
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

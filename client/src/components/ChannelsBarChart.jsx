import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@mui/material";
import QueryState from "./QueryState";
import { getChartTheme } from "utils/chartTheme";

const ChannelsBarChart = ({ data, isLoading, error, onRetry }) => {
  const theme = useTheme();
  const chart = getChartTheme(theme);

  const sortedData = Array.isArray(data)
    ? [...data]
        .sort((a, b) => b.messages - a.messages)
        .slice(0, 12)
    : [];

  return (
    <QueryState
      isLoading={isLoading}
      error={error}
      isEmpty={!isLoading && sortedData.length === 0}
      emptyMessage="No channel data"
      onRetry={onRetry}
      skeletonVariant="bars"
      skeletonHeight={360}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={chart.marginVertical}
          barCategoryGap={chart.barCategoryGap}
        >
          <CartesianGrid {...chart.gridVerticalLayout} />
          <XAxis type="number" {...chart.xAxis} tickFormatter={chart.yAxis.tickFormatter} />
          <YAxis
            type="category"
            dataKey="channel_name"
            {...chart.yAxisCategory}
          />
          <Tooltip {...chart.tooltip} />
          <Bar
            dataKey="messages"
            fill={theme.palette.secondary[300]}
            animationDuration={chart.series.animationDuration}
            animationBegin={0}
            radius={0}
          />
        </BarChart>
      </ResponsiveContainer>
    </QueryState>
  );
};

export default ChannelsBarChart;

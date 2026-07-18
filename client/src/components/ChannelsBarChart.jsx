import React, { useMemo } from "react";
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
import { getChartTheme, getSeriesColor } from "utils/chartTheme";

const ChannelsBarChart = ({ data, isLoading, error, onRetry }) => {
  const theme = useTheme();
  const chart = getChartTheme(theme);

  const sortedData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return [...data]
      .sort((a, b) => (Number(b.messages) || 0) - (Number(a.messages) || 0))
      .slice(0, 8)
      .map((row) => ({
        ...row,
        channel_name: row.channel_name
          ? `#${String(row.channel_name).replace(/^#/, "")}`
          : "unknown",
      }));
  }, [data]);

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
          barCategoryGap="18%"
        >
          <CartesianGrid {...chart.gridVerticalLayout} />
          <XAxis
            type="number"
            {...chart.xAxis}
            tickFormatter={chart.yAxis.tickFormatter}
          />
          <YAxis
            type="category"
            dataKey="channel_name"
            {...chart.yAxisCategory}
            width={100}
          />
          <Tooltip {...chart.tooltip} />
          <Bar
            dataKey="messages"
            fill={getSeriesColor(0)}
            animationDuration={chart.series.animationDuration}
            animationBegin={0}
            radius={[0, 2, 2, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </QueryState>
  );
};

export default ChannelsBarChart;

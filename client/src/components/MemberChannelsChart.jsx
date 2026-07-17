import React, { useMemo } from "react";
import { useTheme } from "@mui/material";
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
import { getChartTheme } from "utils/chartTheme";

const MemberChannelsChart = ({ data, isLoading, error, onRetry }) => {
  const theme = useTheme();
  const chart = getChartTheme(theme);

  const chartData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.slice(0, 8).map((row) => ({
      channel: `#${row.channel_name}`,
      messages: Number(row.messages) || 0,
    }));
  }, [data]);

  return (
    <QueryState
      isLoading={isLoading}
      error={error}
      isEmpty={!isLoading && chartData.length === 0}
      emptyMessage="No channel activity"
      onRetry={onRetry}
      skeletonHeight={260}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={chart.marginVertical}
        >
          <CartesianGrid {...chart.gridVerticalLayout} />
          <XAxis type="number" {...chart.xAxis} />
          <YAxis
            type="category"
            dataKey="channel"
            {...chart.yAxisCategory}
            width={100}
          />
          <Tooltip {...chart.tooltip} />
          <Bar
            dataKey="messages"
            fill={theme.palette.secondary[500]}
            radius={[0, 2, 2, 0]}
            animationDuration={chart.series.animationDuration}
          />
        </BarChart>
      </ResponsiveContainer>
    </QueryState>
  );
};

export default MemberChannelsChart;

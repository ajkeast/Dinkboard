import React, { useMemo } from "react";
import { useTheme } from "@mui/material";
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
import { getChartTheme } from "utils/chartTheme";

/** Drop trailing all-zero months so the chart isn't mostly empty. */
function trimTrailingEmpty(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  let end = rows.length - 1;
  while (end > 0 && Number(rows[end]?.messages || 0) === 0) end -= 1;
  let start = 0;
  while (start < end && Number(rows[start]?.messages || 0) === 0) start += 1;
  return rows.slice(start, end + 1);
}

const MessagesAreaChart = ({ data, isLoading, error, onRetry }) => {
  const theme = useTheme();
  const chart = getChartTheme(theme);
  const chartData = useMemo(() => trimTrailingEmpty(data), [data]);
  const stroke = theme.palette.secondary[300];
  const fill = theme.palette.secondary[500];

  return (
    <QueryState
      isLoading={isLoading}
      error={error}
      isEmpty={!isLoading && chartData.length === 0}
      emptyMessage="No monthly message data"
      onRetry={onRetry}
      skeletonHeight={280}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ ...chart.margin, top: 8, right: 12, bottom: 0 }}
        >
          <defs>
            <linearGradient id="messagesAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity={0.4} />
              <stop offset="70%" stopColor={fill} stopOpacity={0.08} />
              <stop offset="100%" stopColor={fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...chart.grid} />
          <XAxis
            dataKey="month"
            {...chart.xAxis}
            height={40}
            minTickGap={40}
          />
          <YAxis {...chart.yAxis} width={40} />
          <Tooltip
            {...chart.tooltip}
            cursor={{
              stroke: theme.palette.divider,
              strokeWidth: 1,
            }}
          />
          <Area
            type="monotone"
            dataKey="messages"
            stroke={stroke}
            strokeWidth={chart.series.strokeWidth}
            fillOpacity={1}
            fill="url(#messagesAreaGrad)"
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
    </QueryState>
  );
};

export default MessagesAreaChart;

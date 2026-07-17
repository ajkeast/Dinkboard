import React, { useMemo } from "react";
import { useTheme } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import QueryState from "./QueryState";
import { getChartTheme } from "utils/chartTheme";

const PALETTE = [
  "rgb(92, 214, 92)",
  "rgb(92, 92, 214)",
  "rgb(173, 92, 214)",
  "rgb(92, 214, 173)",
  "rgb(92, 173, 214)",
  "rgb(214, 173, 92)",
  "rgb(214, 92, 92)",
  "rgb(173, 214, 92)",
  "rgb(214, 92, 173)",
  "rgb(214, 140, 92)",
  "rgb(92, 214, 214)",
  "rgb(140, 92, 214)",
];

const MessagesBarChart = ({ data, isLoading, error, onRetry }) => {
  const theme = useTheme();
  const chart = getChartTheme(theme);

  const memberKeys = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    const keys = new Set();
    data.forEach((row) => {
      Object.keys(row).forEach((k) => {
        if (k !== "month") keys.add(k);
      });
    });
    return Array.from(keys);
  }, [data]);

  return (
    <QueryState
      isLoading={isLoading}
      error={error}
      isEmpty={!isLoading && (!data || data.length === 0)}
      emptyMessage="No message data yet"
      onRetry={onRetry}
      skeletonVariant="bars"
      skeletonHeight="100%"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={chart.margin} barCategoryGap="12%">
          <CartesianGrid {...chart.grid} />
          <XAxis dataKey="month" {...chart.xAxisAngled} />
          <YAxis {...chart.yAxis} />
          <Tooltip {...chart.tooltip} />
          <Legend {...chart.legend} />
          {memberKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={PALETTE[i % PALETTE.length]}
              animationDuration={0}
              animationBegin={0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </QueryState>
  );
};

export default MessagesBarChart;

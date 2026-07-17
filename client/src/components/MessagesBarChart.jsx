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

const OTHER_KEY = "Other";
const TOP_MEMBERS = 8;

/** Rank members by total volume; keep top N and roll the rest into Other. */
export function toTopMemberStacks(rows, topN = TOP_MEMBERS) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { data: [], memberKeys: [] };
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
    return next;
  });

  return { data, memberKeys };
}

const MessagesBarChart = ({ data, isLoading, error, onRetry }) => {
  const theme = useTheme();
  const chart = getChartTheme(theme);

  const { data: chartData, memberKeys } = useMemo(
    () => toTopMemberStacks(data),
    [data]
  );

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
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={chart.margin} barCategoryGap="12%">
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
              fill={
                key === OTHER_KEY
                  ? theme.palette.grey[500]
                  : PALETTE[i % PALETTE.length]
              }
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

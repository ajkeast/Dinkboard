import React from "react";
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

const JuiceAreaChart = ({ data, isLoading, error, onRetry }) => {
  const theme = useTheme();
  const chart = getChartTheme(theme);

  const formatAxisDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", { month: "short", year: "numeric" });
  };

  const formatTooltipDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  return (
    <QueryState
      isLoading={isLoading}
      error={error}
      isEmpty={!isLoading && (!data || data.length === 0)}
      emptyMessage="No juice data"
      onRetry={onRetry}
      skeletonHeight={320}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={chart.margin}>
          <defs>
            <linearGradient id="juiceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="20%"
                stopColor={theme.palette.secondary[500]}
                stopOpacity={0.35}
              />
              <stop
                offset="95%"
                stopColor={theme.palette.secondary[500]}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid {...chart.grid} />
          <XAxis
            {...chart.xAxisAngled}
            dataKey="eastern_timestamp"
            tickFormatter={formatAxisDate}
          />
          <YAxis {...chart.yAxis} />
          <Tooltip {...chart.tooltip} labelFormatter={formatTooltipDate} />
          <Area
            type="monotone"
            dataKey="juice"
            stroke={theme.palette.secondary[300]}
            strokeWidth={chart.series.strokeWidth}
            fillOpacity={1}
            fill="url(#juiceGrad)"
            animationDuration={chart.series.animationDuration}
            animationBegin={0}
          />
        </AreaChart>
      </ResponsiveContainer>
    </QueryState>
  );
};

export default JuiceAreaChart;

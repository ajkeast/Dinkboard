import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Box, CardContent, Typography, useMediaQuery, useTheme } from "@mui/material";
import Header from "components/Header";
import DashCard from "components/DashCard";
import QueryState from "components/QueryState";
import { useGetCumCountQuery } from "state/api";
import { getChartTheme } from "utils/chartTheme";

function generateColorShades(n) {
  const colorGradient = [];
  for (let i = 0; i < n; i++) {
    const hue = n <= 1 ? 200 : (i / (n - 1)) * 360;
    colorGradient.push(`hsl(${hue}, 60%, 60%)`);
  }
  return colorGradient;
}

const formatDate = (unixTime) => {
  const date = new Date(unixTime * 1000);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
};

const Firsts = () => {
  const theme = useTheme();
  const chart = getChartTheme(theme);
  const isMd = useMediaQuery("(min-width: 750px)");
  const { data, error, refetch } = useGetCumCountQuery();
  const [colorShades, setColorShades] = useState([]);
  const [domain, setDomain] = useState([0, 0]);
  const [xAxisTicks, setXAxisTicks] = useState([]);

  const showSkeleton = !Array.isArray(data) && !error;

  const series = useMemo(
    () =>
      Array.isArray(data)
        ? data.filter(
            (item) => Array.isArray(item?.data) && item.data.length > 0
          )
        : [],
    [data]
  );

  useEffect(() => {
    if (!series.length) {
      setColorShades([]);
      setDomain([0, 0]);
      setXAxisTicks([]);
      return;
    }

    setColorShades(generateColorShades(series.length));

    const allDates = series.flatMap((item) =>
      item.data.map((d) => d.timesent).filter((t) => Number.isFinite(t))
    );
    if (!allDates.length) return;

    const minDate = Math.min(...allDates);
    const maxDate = Math.max(...allDates);
    setDomain([minDate, maxDate]);

    const tickCount = 6;
    const step = tickCount > 1 ? (maxDate - minDate) / (tickCount - 1) : 0;
    const ticks = Array.from({ length: tickCount }, (_, i) =>
      Math.round(minDate + step * i)
    );
    setXAxisTicks(ticks);
  }, [series]);

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
              {/*
                Custom overlay legend (not Recharts <Legend>) so the chart never
                shrinks to reserve legend space — critical on mobile.
              */}
              <Box position="relative" width="100%" height="100%">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart margin={chart.margin}>
                    <CartesianGrid {...chart.grid} />
                    <XAxis
                      {...chart.xAxisAngled}
                      dataKey="timesent"
                      type="number"
                      domain={domain}
                      ticks={xAxisTicks}
                      tickFormatter={formatDate}
                      allowDataOverflow
                    />
                    <YAxis {...chart.yAxis} />
                    <Tooltip {...chart.tooltip} labelFormatter={formatDate} />
                    {series.map((s, index) => (
                      <Line
                        dataKey="cum_count"
                        data={s.data}
                        name={s.name}
                        key={s.name}
                        type="monotone"
                        stroke={colorShades[index]}
                        strokeWidth={chart.series.strokeWidth}
                        dot={false}
                        animationDuration={chart.series.animationDuration}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>

                {series.length > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: (chart.margin?.top || 12) + 4,
                      left: (chart.yAxis.width || 48) + (chart.margin?.left || 4) + 8,
                      zIndex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.35,
                      maxWidth: isMd ? "40%" : "55%",
                      maxHeight: isMd ? "50%" : "42%",
                      overflowY: "auto",
                      px: 0.75,
                      py: 0.5,
                      borderRadius: `${theme.shape.borderRadius}px`,
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? "rgba(15, 17, 21, 0.62)"
                          : "rgba(255, 255, 255, 0.78)",
                      border: `1px solid ${theme.palette.divider}`,
                      pointerEvents: "auto",
                    }}
                  >
                    {series.map((s, index) => (
                      <Box
                        key={s.name}
                        display="flex"
                        alignItems="center"
                        gap={0.6}
                        minWidth={0}
                      >
                        <Box
                          width={8}
                          height={8}
                          borderRadius="1px"
                          flexShrink={0}
                          bgcolor={colorShades[index]}
                        />
                        <Typography
                          variant="caption"
                          noWrap
                          title={s.name}
                          sx={{
                            fontSize: 11,
                            lineHeight: 1.2,
                            color: theme.palette.text.secondary,
                          }}
                        >
                          {s.name}
                        </Typography>
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

import React, { useMemo } from "react";
import { Box, useTheme, Typography, useMediaQuery } from "@mui/material";
import {
  useGetAIStatsQuery,
  useGetChatGPTTimelineQuery,
  useGetChatGPTUserStatsQuery,
  useGetDalleUserStatsQuery,
  useGetChatGPTModelStatsQuery,
} from "state/api";
import { SmartToy, Image, Token } from "@mui/icons-material";
import StatStrip from "components/StatStrip";
import Header from "components/Header";
import QueryState from "components/QueryState";
import DashCard from "components/DashCard";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getChartTheme, formatSeriesLabel } from "utils/chartTheme";
import { formatDateShort, formatMonthLabel } from "utils/datetime";

const COLORS = [
  "#694fce",
  "#22a06b",
  "#d97706",
  "#2563eb",
  "#db2777",
  "#0891b2",
];

const cleanDisplayName = (v) => formatSeriesLabel(v);

const AI = () => {
  const theme = useTheme();
  const chart = getChartTheme(theme);
  const isXl = useMediaQuery("(min-width: 1200px)");
  const isMd = useMediaQuery("(min-width: 750px)");

  const {
    data: aiStats,
    isLoading: statsLoading,
    error: statsError,
  } = useGetAIStatsQuery();
  const {
    data: chatgptTimeline,
    isLoading: timelineLoading,
    error: timelineError,
    refetch: refetchTimeline,
  } = useGetChatGPTTimelineQuery();
  const {
    data: chatgptUsers,
    isLoading: chatgptUsersLoading,
    error: chatgptUsersError,
    refetch: refetchChatgptUsers,
  } = useGetChatGPTUserStatsQuery();
  const {
    data: dalleUsers,
    isLoading: dalleUsersLoading,
    error: dalleUsersError,
    refetch: refetchDalleUsers,
  } = useGetDalleUserStatsQuery();
  const {
    data: modelStats,
    isLoading: modelLoading,
    error: modelError,
    refetch: refetchModels,
  } = useGetChatGPTModelStatsQuery();

  const timelineData = useMemo(
    () =>
      (chatgptTimeline || []).map((row) => ({
        ...row,
        total_calls: Number(row.total_calls) || 0,
      })),
    [chatgptTimeline]
  );

  const modelData = useMemo(
    () =>
      (modelStats || [])
        .map((row) => ({
          ...row,
          total_calls: Number(row.total_calls) || 0,
          model: row.model || "unknown",
        }))
        .filter((row) => row.total_calls > 0),
    [modelStats]
  );

  const llmUserData = useMemo(
    () =>
      (chatgptUsers || []).slice(0, 5).map((row) => ({
        ...row,
        total_calls: Number(row.total_calls) || 0,
        display_name: cleanDisplayName(row.display_name || row.user_name),
      })),
    [chatgptUsers]
  );

  const imageUserData = useMemo(
    () =>
      (dalleUsers || []).slice(0, 5).map((row) => ({
        ...row,
        total_prompts: Number(row.total_prompts) || 0,
        display_name: cleanDisplayName(row.display_name || row.user_name),
      })),
    [dalleUsers]
  );

  const chatgptData = aiStats
    ? [
        {
          thisMTD: Number(aiStats.chatgpt_last_30_days) || 0,
          lastMTD: Number(aiStats.chatgpt_prev_30_days) || 0,
        },
      ]
    : [];

  const dalleData = aiStats
    ? [
        {
          thisMTD: Number(aiStats.dalle_last_30_days) || 0,
          lastMTD: Number(aiStats.dalle_prev_30_days) || 0,
        },
      ]
    : [];

  const tokenData = aiStats
    ? [
        {
          thisMTD: Number(aiStats.total_tokens_last_30_days) || 0,
          lastMTD: Number(aiStats.total_tokens_prev_30_days) || 0,
        },
      ]
    : [];

  const span = (n) => {
    if (isXl) return `span ${n}`;
    if (isMd) return n <= 4 ? "span 6" : "span 12";
    return "span 12";
  };

  const chartCardSx = {
    p: 1.5,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    minWidth: 0,
    overflow: "visible",
  };

  return (
    <Box>
      <Header title="AI Usage" subtitle="LLM prompts and image generation" />

      <Box mt={1.5}>
        <StatStrip
          items={[
            {
              title: "LLM Prompts",
              description: "vs. prior 30 days",
              data: chatgptData,
              icon: (
                <SmartToy
                  sx={{ color: theme.palette.secondary[300], fontSize: 20 }}
                />
              ),
              isLoading: statsLoading,
              error: statsError,
              time: "month",
            },
            {
              title: "Images",
              description: "vs. prior 30 days",
              data: dalleData,
              icon: (
                <Image
                  sx={{ color: theme.palette.secondary[300], fontSize: 20 }}
                />
              ),
              isLoading: statsLoading,
              error: statsError,
              time: "month",
            },
            {
              title: "Total Tokens",
              description: "vs. prior 30 days",
              data: tokenData,
              icon: (
                <Token
                  sx={{ color: theme.palette.secondary[300], fontSize: 20 }}
                />
              ),
              isLoading: statsLoading,
              error: statsError,
              time: "month",
            },
          ]}
        />
      </Box>

      <Box
        mt={1.5}
        display="grid"
        gridTemplateColumns="repeat(12, 1fr)"
        gridAutoRows="160px"
        gap={1.5}
      >
        <DashCard
          sx={{
            ...chartCardSx,
            gridColumn: "span 12",
            gridRow: "span 2",
          }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1, flexShrink: 0 }}>
            AI Usage Timeline
          </Typography>
          <Box flex={1} minHeight={0} minWidth={0}>
            <QueryState
              isLoading={timelineLoading}
              error={timelineError}
              isEmpty={!timelineLoading && timelineData.length === 0}
              emptyMessage="No timeline data"
              onRetry={refetchTimeline}
              skeletonVariant="area"
              skeletonHeight="100%"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={chart.margin}>
                  <defs>
                    <linearGradient id="colorLlmPrompts" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={theme.palette.secondary[400]}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor={theme.palette.secondary[400]}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...chart.grid} />
                  <XAxis
                    dataKey="time_period"
                    {...chart.xAxisAngled}
                    tickFormatter={(v) =>
                      /^\d{4}-\d{2}$/.test(String(v))
                        ? formatMonthLabel(v)
                        : formatDateShort(v)
                    }
                  />
                  <YAxis {...chart.yAxis} width={48} />
                  <Tooltip
                    {...chart.tooltip}
                    labelFormatter={(v) =>
                      /^\d{4}-\d{2}$/.test(String(v))
                        ? formatMonthLabel(v)
                        : formatDateShort(v)
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="total_calls"
                    stroke={theme.palette.secondary[300]}
                    strokeWidth={chart.series.strokeWidth}
                    fillOpacity={1}
                    fill="url(#colorLlmPrompts)"
                    name="LLM Prompts"
                    animationDuration={chart.series.animationDuration}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </QueryState>
          </Box>
        </DashCard>

        <DashCard
          sx={{
            ...chartCardSx,
            gridColumn: span(4),
            gridRow: "span 2",
          }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1, flexShrink: 0 }}>
            Model Distribution
          </Typography>
          <Box flex={1} minHeight={0} minWidth={0}>
            <QueryState
              isLoading={modelLoading}
              error={modelError}
              isEmpty={!modelLoading && modelData.length === 0}
              emptyMessage="No model data"
              onRetry={refetchModels}
              skeletonVariant="pie"
              skeletonHeight="100%"
            >
              <Box height="100%" display="flex" flexDirection="column" minHeight={0}>
                <Box flex="1 1 auto" minHeight={140} minWidth={0}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modelData}
                        innerRadius="42%"
                        outerRadius="70%"
                        paddingAngle={3}
                        dataKey="total_calls"
                        nameKey="model"
                        animationDuration={300}
                      >
                        {modelData.map((entry, index) => (
                          <Cell
                            key={`cell-${entry.model}-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip {...chart.tooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box
                  display="flex"
                  flexWrap="wrap"
                  gap={1}
                  justifyContent="center"
                  pt={1}
                >
                  {modelData.map((entry, index) => (
                    <Box
                      key={entry.model || index}
                      display="flex"
                      alignItems="center"
                      gap={0.5}
                      maxWidth="100%"
                    >
                      <Box
                        width={8}
                        height={8}
                        borderRadius={0}
                        bgcolor={COLORS[index % COLORS.length]}
                        flexShrink={0}
                      />
                      <Typography
                        variant="caption"
                        noWrap
                        title={entry.model}
                        sx={{ maxWidth: 140 }}
                      >
                        {entry.model}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </QueryState>
          </Box>
        </DashCard>

        <DashCard
          sx={{
            ...chartCardSx,
            gridColumn: span(6),
            gridRow: "span 2",
          }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1, flexShrink: 0 }}>
            Top LLM Users
          </Typography>
          <Box flex={1} minHeight={0} minWidth={0}>
            <QueryState
              isLoading={chatgptUsersLoading}
              error={chatgptUsersError}
              isEmpty={!chatgptUsersLoading && llmUserData.length === 0}
              emptyMessage="No user data"
              onRetry={refetchChatgptUsers}
              skeletonVariant="bars"
              skeletonHeight="100%"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={llmUserData}
                  layout="vertical"
                  margin={chart.marginVertical}
                  barCategoryGap={chart.barCategoryGap}
                >
                  <CartesianGrid {...chart.gridVerticalLayout} />
                  <XAxis
                    type="number"
                    {...chart.xAxis}
                    tickFormatter={chart.yAxis.tickFormatter}
                  />
                  <YAxis
                    {...chart.yAxisCategory}
                    type="category"
                    dataKey="display_name"
                    width={100}
                  />
                  <Tooltip {...chart.tooltip} />
                  <Bar
                    dataKey="total_calls"
                    fill={theme.palette.secondary[400]}
                    name="Total Calls"
                    radius={0}
                    animationDuration={chart.series.animationDuration}
                  />
                </BarChart>
              </ResponsiveContainer>
            </QueryState>
          </Box>
        </DashCard>

        <DashCard
          sx={{
            ...chartCardSx,
            gridColumn: span(6),
            gridRow: "span 2",
          }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1, flexShrink: 0 }}>
            Top Image Users
          </Typography>
          <Box flex={1} minHeight={0} minWidth={0}>
            <QueryState
              isLoading={dalleUsersLoading}
              error={dalleUsersError}
              isEmpty={!dalleUsersLoading && imageUserData.length === 0}
              emptyMessage="No user data"
              onRetry={refetchDalleUsers}
              skeletonVariant="bars"
              skeletonHeight="100%"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={imageUserData}
                  layout="vertical"
                  margin={chart.marginVertical}
                  barCategoryGap={chart.barCategoryGap}
                >
                  <CartesianGrid {...chart.gridVerticalLayout} />
                  <XAxis
                    type="number"
                    {...chart.xAxis}
                    tickFormatter={chart.yAxis.tickFormatter}
                  />
                  <YAxis
                    {...chart.yAxisCategory}
                    type="category"
                    dataKey="display_name"
                    width={100}
                  />
                  <Tooltip {...chart.tooltip} />
                  <Bar
                    dataKey="total_prompts"
                    fill={theme.palette.secondary[300]}
                    name="Total Prompts"
                    radius={0}
                    animationDuration={chart.series.animationDuration}
                  />
                </BarChart>
              </ResponsiveContainer>
            </QueryState>
          </Box>
        </DashCard>
      </Box>
    </Box>
  );
};

export default AI;

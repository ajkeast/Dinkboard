import React from "react";
import { Box, useTheme, Typography, useMediaQuery } from "@mui/material";
import {
  useGetAIStatsQuery,
  useGetChatGPTTimelineQuery,
  useGetChatGPTUserStatsQuery,
  useGetDalleUserStatsQuery,
  useGetChatGPTModelStatsQuery,
} from "state/api";
import { SmartToy, Image, Token } from "@mui/icons-material";
import StatBox from "components/StatBox";
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
import { getChartTheme } from "utils/chartTheme";

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

  const COLORS = [
    "#694fce",
    "#22a06b",
    "#d97706",
    "#2563eb",
    "#db2777",
    "#0891b2",
  ];

  const chatgptData = aiStats
    ? [
        {
          thisMTD: aiStats.chatgpt_today || 0,
          lastMTD: (aiStats.chatgpt_last_30_days || 0) / 30,
        },
      ]
    : [];

  const dalleData = aiStats
    ? [
        {
          thisMTD: aiStats.dalle_today || 0,
          lastMTD: (aiStats.dalle_last_30_days || 0) / 30,
        },
      ]
    : [];

  const tokenData = aiStats
    ? [
        {
          thisMTD: Number(aiStats.total_tokens_last_30_days) || 0,
          lastMTD: Number(aiStats.total_tokens_last_30_days) || 0,
        },
      ]
    : [];

  const span = (n) => {
    if (isXl) return `span ${n}`;
    if (isMd) return n <= 4 ? "span 6" : "span 12";
    return "span 12";
  };

  return (
    <Box>
      <Header title="AI Usage" subtitle="ChatGPT and DALL-E activity" />

      <Box
        mt={1.5}
        display="grid"
        gridTemplateColumns="repeat(12, 1fr)"
        gridAutoRows="160px"
        gap={1.5}
      >
        <StatBox
          title="ChatGPT Calls"
          description="vs. last 30 days"
          data={chatgptData}
          icon={
            <SmartToy
              sx={{ color: theme.palette.secondary[300], fontSize: 20 }}
            />
          }
          isLoading={statsLoading}
          error={statsError}
          time="month"
          sx={{ gridColumn: span(2) }}
        />

        <StatBox
          title="DALL-E Prompts"
          description="vs. last 30 days"
          data={dalleData}
          icon={
            <Image
              sx={{ color: theme.palette.secondary[300], fontSize: 20 }}
            />
          }
          isLoading={statsLoading}
          error={statsError}
          time="month"
          sx={{ gridColumn: span(2) }}
        />

        <StatBox
          title="Total Tokens"
          description="Last 30 Days"
          data={tokenData}
          icon={
            <Token
              sx={{ color: theme.palette.secondary[300], fontSize: 20 }}
            />
          }
          isLoading={statsLoading}
          error={statsError}
          time="month"
          sx={{ gridColumn: span(2) }}
        />

        <DashCard
          sx={{
            gridColumn: span(8),
            gridRow: "span 2",
            p: 1.5,
          }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
            AI Usage Timeline
          </Typography>
          <Box height="calc(100% - 28px)">
            <QueryState
              isLoading={timelineLoading}
              error={timelineError}
              isEmpty={
                !timelineLoading &&
                (!chatgptTimeline || chatgptTimeline.length === 0)
              }
              emptyMessage="No timeline data"
              onRetry={refetchTimeline}
              skeletonVariant="area"
              skeletonHeight="100%"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chatgptTimeline} margin={chart.margin}>
                  <defs>
                    <linearGradient id="colorChatGPT" x1="0" y1="0" x2="0" y2="1">
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
                  <XAxis dataKey="time_period" {...chart.xAxisAngled} />
                  <YAxis {...chart.yAxis} />
                  <Tooltip {...chart.tooltip} />
                  <Area
                    type="monotone"
                    dataKey="total_calls"
                    stroke={theme.palette.secondary[300]}
                    strokeWidth={chart.series.strokeWidth}
                    fillOpacity={1}
                    fill="url(#colorChatGPT)"
                    name="ChatGPT Calls"
                    animationDuration={chart.series.animationDuration}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </QueryState>
          </Box>
        </DashCard>

        <DashCard
          sx={{
            gridColumn: span(4),
            gridRow: "span 2",
            p: 1.5,
          }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
            Model Distribution
          </Typography>
          <Box height="calc(100% - 28px)">
            <QueryState
              isLoading={modelLoading}
              error={modelError}
              isEmpty={!modelLoading && (!modelStats || modelStats.length === 0)}
              emptyMessage="No model data"
              onRetry={refetchModels}
              skeletonVariant="pie"
              skeletonHeight="100%"
            >
              <Box height="100%" display="flex" flexDirection="column">
                <Box flex="1 1 auto" minHeight={140}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modelStats || []}
                        innerRadius="42%"
                        outerRadius="70%"
                        paddingAngle={3}
                        dataKey="total_calls"
                        nameKey="model"
                        animationDuration={300}
                      >
                        {(modelStats || []).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
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
                  {(modelStats || []).map((entry, index) => (
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
            gridColumn: span(6),
            gridRow: "span 2",
            p: 1.5,
          }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
            Top ChatGPT Users
          </Typography>
          <Box height="calc(100% - 28px)">
            <QueryState
              isLoading={chatgptUsersLoading}
              error={chatgptUsersError}
              isEmpty={
                !chatgptUsersLoading &&
                (!chatgptUsers || chatgptUsers.length === 0)
              }
              emptyMessage="No user data"
              onRetry={refetchChatgptUsers}
              skeletonVariant="bars"
              skeletonHeight="100%"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(chatgptUsers || []).slice(0, 5)}
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
                    width={120}
                    tickFormatter={(v) =>
                      String(v || "").replace(/\s*:[^:]+:\s*/g, " ").trim()
                    }
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
            gridColumn: span(6),
            gridRow: "span 2",
            p: 1.5,
          }}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
            Top DALL-E Users
          </Typography>
          <Box height="calc(100% - 28px)">
            <QueryState
              isLoading={dalleUsersLoading}
              error={dalleUsersError}
              isEmpty={
                !dalleUsersLoading && (!dalleUsers || dalleUsers.length === 0)
              }
              emptyMessage="No user data"
              onRetry={refetchDalleUsers}
              skeletonVariant="bars"
              skeletonHeight="100%"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(dalleUsers || []).slice(0, 5)}
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
                    width={120}
                    tickFormatter={(v) =>
                      String(v || "").replace(/\s*:[^:]+:\s*/g, " ").trim()
                    }
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

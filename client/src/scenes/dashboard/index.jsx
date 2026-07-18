import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  CardContent,
  Link,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  MessageRounded,
  LeaderboardRounded,
  CalendarMonthRounded,
  CalendarTodayRounded,
  Tag,
  EmojiEmotions,
  SmartToyOutlined,
  BlenderRounded,
  ArrowForwardRounded,
} from "@mui/icons-material";
import Header from "components/Header";
import DashCard from "components/DashCard";
import StatStrip from "components/StatStrip";
import FirstTable from "components/FirstTable";
import ChannelsBarChart from "components/ChannelsBarChart";
import EmojisPieChart from "components/EmojisPieChart";
import MessagesAreaChart from "components/MessagesAreaChart";
import {
  useGetScoreQuery,
  useGetMessagesByChannelQuery,
  useGetMessagesByMonthQuery,
  useGetMessagesStatsQuery,
  useGetEmojisQuery,
  useGetAIStatsQuery,
  useGetJuiceByMemberQuery,
  useGetMembersQuery,
} from "state/api";
import { formatCompact, formatSeriesLabel } from "utils/chartTheme";

const SectionHeader = ({ title, subtitle, to, linkLabel = "View all", icon }) => {
  const theme = useTheme();

  return (
    <Box
      display="flex"
      alignItems="flex-start"
      justifyContent="space-between"
      gap={1}
      mb={1.25}
      minWidth={0}
    >
      <Box minWidth={0}>
        <Box display="flex" alignItems="center" gap={0.75} minWidth={0}>
          {icon && (
            <Box
              sx={{
                color: theme.palette.secondary[300],
                display: "flex",
                "& svg": { fontSize: 18 },
              }}
            >
              {icon}
            </Box>
          )}
          <Typography variant="h6" fontWeight={600} noWrap>
            {title}
          </Typography>
        </Box>
        {subtitle && (
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mt={0.25}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {to && (
        <Link
          component={RouterLink}
          to={to}
          underline="hover"
          variant="caption"
          fontWeight={600}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.25,
            flexShrink: 0,
            color: theme.palette.secondary[300],
            mt: 0.25,
          }}
        >
          {linkLabel}
          <ArrowForwardRounded sx={{ fontSize: 14 }} />
        </Link>
      )}
    </Box>
  );
};

const LeaderKpi = ({ title, value, description, icon, isLoading }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        flex: "1 1 0",
        minWidth: 0,
        px: { xs: 1, sm: 1.5 },
        py: 1.25,
      }}
    >
      <Box display="flex" alignItems="center" gap={0.5} mb={0.5} minWidth={0}>
        {icon && (
          <Box
            sx={{
              color: "text.secondary",
              display: "flex",
              flexShrink: 0,
              "& svg": { fontSize: 16 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          variant="caption"
          fontWeight={600}
          color="text.secondary"
          noWrap
          sx={{
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            minWidth: 0,
          }}
        >
          {title}
        </Typography>
      </Box>
      {isLoading ? (
        <Box
          sx={{
            height: 22,
            width: "55%",
            borderRadius: 1,
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.08)",
          }}
        />
      ) : (
        <>
          <Typography
            variant="h5"
            fontWeight={700}
            noWrap
            sx={{ color: theme.palette.text.primary, lineHeight: 1.2 }}
          >
            {formatCompact(value)}
          </Typography>
          {description && (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              noWrap
              mt={0.5}
              title={description}
            >
              {description}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
};

const Dashboard = () => {
  const isXl = useMediaQuery("(min-width: 1100px)");
  const isMd = useMediaQuery("(min-width: 750px)");

  const {
    data: scoreData,
    isLoading: isScoreLoading,
    error: scoreError,
    refetch: refetchScore,
  } = useGetScoreQuery();
  const {
    data: messagesStatsData,
    isLoading: isMessagesStatsLoading,
    error: statsError,
  } = useGetMessagesStatsQuery();
  const {
    data: messagesByChannelData,
    isLoading: isMessagesByChannelLoading,
    error: channelError,
    refetch: refetchChannels,
  } = useGetMessagesByChannelQuery();
  const {
    data: messagesByMonthData,
    isLoading: isMessagesByMonthLoading,
    error: monthError,
    refetch: refetchMonth,
  } = useGetMessagesByMonthQuery();
  const {
    data: emojiData,
    isLoading: isEmojiLoading,
    error: emojiError,
    refetch: refetchEmojis,
  } = useGetEmojisQuery();
  const {
    data: aiStats,
    isLoading: isAiLoading,
    error: aiError,
  } = useGetAIStatsQuery();
  const {
    data: juiceData,
    isLoading: isJuiceLoading,
  } = useGetJuiceByMemberQuery();
  const {
    data: membersData,
    isLoading: isMembersLoading,
  } = useGetMembersQuery();

  const firstsLeader = useMemo(() => {
    if (!Array.isArray(scoreData) || scoreData.length === 0) return null;
    const sorted = [...scoreData].sort(
      (a, b) => (Number(b.firsts) || 0) - (Number(a.firsts) || 0)
    );
    const top = sorted[0];
    return {
      name: formatSeriesLabel(top.user_name) || top.user_name || "Unknown",
      value: Number(top.firsts) || 0,
    };
  }, [scoreData]);

  const juiceLeader = useMemo(() => {
    if (!Array.isArray(juiceData) || juiceData.length === 0) return null;
    const nameById = new Map(
      (Array.isArray(membersData) ? membersData : []).map((m) => [
        String(m.id),
        formatSeriesLabel(m.display_name || m.user_name) ||
          m.user_name ||
          "Unknown",
      ])
    );
    const sorted = [...juiceData].sort(
      (a, b) => (Number(b.total_juice) || 0) - (Number(a.total_juice) || 0)
    );
    const top = sorted[0];
    return {
      name: nameById.get(String(top.user_id)) || "Unknown",
      value: Math.round(Number(top.total_juice) || 0),
    };
  }, [juiceData, membersData]);

  const llmStats = useMemo(() => {
    if (!aiStats) return null;
    return [
      {
        thisMTD: Number(aiStats.chatgpt_last_30_days) || 0,
        lastMTD: Number(aiStats.chatgpt_prev_30_days) || 0,
      },
    ];
  }, [aiStats]);

  const span = (cols) => {
    if (isXl) return `span ${cols}`;
    if (isMd) return cols <= 4 ? "span 6" : "span 12";
    return "span 12";
  };

  return (
    <Box>
      <Header
        title="Dashboard"
        subtitle="Messages, firsts, juice, and culture at a glance"
      />

      <Box
        mt={1.5}
        display="grid"
        gridTemplateColumns="repeat(12, minmax(0, 1fr))"
        gap={1.5}
      >
        <Box
          sx={{
            gridColumn: "span 12",
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            gap: 1.5,
            minWidth: 0,
          }}
        >
          <Box flex={{ xs: "1 1 auto", lg: "1 1 58%" }} minWidth={0}>
            <StatStrip
              items={[
                {
                  title: "Monthly",
                  time: "month",
                  icon: <CalendarTodayRounded fontSize="small" />,
                  description: "Messages vs prior month",
                  data: messagesStatsData,
                  isLoading: isMessagesStatsLoading,
                  error: statsError,
                },
                {
                  title: "Yearly",
                  time: "year",
                  icon: <CalendarMonthRounded fontSize="small" />,
                  description: "Messages vs prior year",
                  data: messagesStatsData,
                  isLoading: isMessagesStatsLoading,
                  error: statsError,
                },
                {
                  title: "LLM Prompts",
                  time: "month",
                  icon: <SmartToyOutlined fontSize="small" />,
                  description: "vs prior 30 days",
                  data: llmStats,
                  isLoading: isAiLoading,
                  error: aiError,
                },
              ]}
            />
          </Box>

          <DashCard sx={{ flex: { xs: "1 1 auto", lg: "1 1 42%" }, minWidth: 0 }}>
            <Box
              display="flex"
              flexDirection="row"
              alignItems="stretch"
              sx={{
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <LeaderKpi
                title="Firsts lead"
                value={firstsLeader?.value ?? 0}
                description={
                  firstsLeader
                    ? firstsLeader.name
                    : isScoreLoading
                      ? "Loading…"
                      : "No data"
                }
                icon={<LeaderboardRounded fontSize="small" />}
                isLoading={isScoreLoading}
              />
              <Box
                sx={{
                  width: "1px",
                  alignSelf: "stretch",
                  bgcolor: "divider",
                  flexShrink: 0,
                }}
              />
              <LeaderKpi
                title="Juice lead"
                value={juiceLeader?.value ?? 0}
                description={
                  juiceLeader
                    ? juiceLeader.name
                    : isJuiceLoading || isMembersLoading
                      ? "Loading…"
                      : "No data"
                }
                icon={<BlenderRounded fontSize="small" />}
                isLoading={isJuiceLoading || isMembersLoading}
              />
            </Box>
          </DashCard>
        </Box>

        <DashCard sx={{ gridColumn: "span 12", gridRow: "span 2" }}>
          <CardContent>
            <SectionHeader
              title="Message volume"
              subtitle="Monthly totals across the server"
              to="/messages"
              icon={<MessageRounded />}
            />
            <Box height={{ xs: 280, md: 360 }} width="100%">
              <MessagesAreaChart
                data={messagesByMonthData}
                isLoading={isMessagesByMonthLoading}
                error={monthError}
                onRetry={refetchMonth}
              />
            </Box>
          </CardContent>
        </DashCard>

        <DashCard
          sx={{
            gridColumn: span(7),
            gridRow: "span 2",
            alignSelf: "start",
            width: "100%",
          }}
        >
          <CardContent>
            <SectionHeader
              title="Firsts"
              subtitle="All-time claim leaderboard"
              to="/firsts"
              icon={<LeaderboardRounded />}
            />
            <FirstTable
              data={scoreData}
              isLoading={isScoreLoading}
              error={scoreError}
              onRetry={refetchScore}
            />
          </CardContent>
        </DashCard>

        <DashCard
          sx={{ gridColumn: span(5), gridRow: "span 2", minHeight: 400 }}
        >
          <CardContent>
            <SectionHeader
              title="Channels"
              subtitle="Top rooms by message volume"
              to="/messages"
              linkLabel="Explore"
              icon={<Tag />}
            />
            <Box height={340} width="100%">
              <ChannelsBarChart
                data={messagesByChannelData}
                isLoading={isMessagesByChannelLoading}
                error={channelError}
                onRetry={refetchChannels}
              />
            </Box>
          </CardContent>
        </DashCard>

        <DashCard sx={{ gridColumn: span(12), gridRow: "span 1" }}>
          <CardContent>
            <SectionHeader
              title="Top emojis"
              subtitle="Most used custom emoji on the server"
              to="/emojis"
              icon={<EmojiEmotions />}
            />
            <Box
              width="100%"
              height={{ xs: "auto", sm: 280 }}
              minHeight={{ xs: 320, sm: 280 }}
            >
              <EmojisPieChart
                data={emojiData}
                isLoading={isEmojiLoading}
                error={emojiError}
                onRetry={refetchEmojis}
              />
            </Box>
          </CardContent>
        </DashCard>
      </Box>
    </Box>
  );
};

export default Dashboard;

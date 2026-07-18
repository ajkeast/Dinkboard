import React from "react";
import FirstTable from "components/FirstTable";
import ChannelsBarChart from "components/ChannelsBarChart";
import EmojisPieChart from "components/EmojisPieChart";
import DashCard from "components/DashCard";
import Header from "components/Header";
import StatStrip from "components/StatStrip";
import MessagesAreaChart from "components/MessagesAreaChart";
import {
  useGetScoreQuery,
  useGetMessagesByChannelQuery,
  useGetMessagesByMonthQuery,
  useGetMessagesStatsQuery,
  useGetEmojisQuery,
} from "state/api";
import { Box, Typography, useMediaQuery, CardContent } from "@mui/material";
import {
  MessageRounded,
  LeaderboardRounded,
  CalendarMonthRounded,
  CalendarTodayRounded,
  Tag,
  EmojiEmotions,
} from "@mui/icons-material";

const Dashboard = () => {
  // Content area is often <1440 once the sidebar is open
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

  const span = (cols) => {
    if (isXl) return `span ${cols}`;
    if (isMd) return cols <= 4 ? "span 6" : "span 12";
    return "span 12";
  };

  return (
    <Box>
      <Header title="Dashboard" subtitle="Welcome to your Dashboard" />
      <Box
        mt={1.5}
        display="grid"
        gridTemplateColumns="repeat(12, minmax(0, 1fr))"
        justifyContent="space-between"
        gap={1.5}
      >
        <StatStrip
          sx={{ gridColumn: "span 12" }}
          items={[
            {
              title: "Yearly",
              time: "year",
              icon: <CalendarMonthRounded fontSize="small" />,
              description: "Since last year",
              data: messagesStatsData,
              isLoading: isMessagesStatsLoading,
              error: statsError,
            },
            {
              title: "Monthly",
              time: "month",
              icon: <CalendarTodayRounded fontSize="small" />,
              description: "Since last month",
              data: messagesStatsData,
              isLoading: isMessagesStatsLoading,
              error: statsError,
            },
          ]}
        />

        <DashCard sx={{ gridColumn: "span 12", gridRow: "span 2" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              <MessageRounded
                fontSize="small"
                sx={{ verticalAlign: "middle", mr: 0.5 }}
              />{" "}
              Messages
            </Typography>
            <Box height={300} width="100%">
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
            <Typography variant="h6" fontWeight={600} gutterBottom>
              <LeaderboardRounded
                fontSize="small"
                sx={{ verticalAlign: "middle", mr: 0.5 }}
              />{" "}
              Firsts
            </Typography>
            <FirstTable
              data={scoreData}
              isLoading={isScoreLoading}
              error={scoreError}
              onRetry={refetchScore}
            />
          </CardContent>
        </DashCard>

        <DashCard sx={{ gridColumn: span(5), gridRow: "span 2", minHeight: 400 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              <Tag
                fontSize="small"
                sx={{ verticalAlign: "middle", mr: 0.5 }}
              />{" "}
              Channels
            </Typography>
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
            <Typography variant="h6" fontWeight={600} gutterBottom>
              <EmojiEmotions
                fontSize="small"
                sx={{ verticalAlign: "middle", mr: 0.5 }}
              />{" "}
              Top Emojis
            </Typography>
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

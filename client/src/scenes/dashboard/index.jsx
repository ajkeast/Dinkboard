import React, { useState } from 'react';
import FirstTable from 'components/FirstTable';
import EmojiPieChart from 'components/EmojiPieChart';
import Header from "components/Header";
import StatBox from 'components/StatBox';
import MessagesAreaChart from 'components/MessagesAreaChart';
import { 
  useGetScoreQuery, 
  useGetEmojisQuery,
  useGetEmojisCountQuery,
  useGetMessagesByChannelQuery, 
  useGetMessagesByMonthQuery,
  useGetMessagesByMonthByMemberQuery 
} from "state/api";
import {
  Box,
  Button,
  Card,
  Typography,
  useTheme,
  useMediaQuery,
  CardContent,
  Grow,
} from "@mui/material";
import {
  MessageRounded,
  LeaderboardRounded,
  CalendarMonth,
  CalendarMonthRounded,
  CalendarViewDayRounded,
  CalendarTodayRounded
} from "@mui/icons-material";
import FlexBetween from 'components/FlexBetween';

const Dashboard = () => {

  const isCardVisible = true;
  const theme = useTheme();
  const isNonMobile = useMediaQuery("(min-width: 1000px)");
  const { data: emojiCountData, isLoading: isEmojiCountLoading } = useGetEmojisCountQuery();
  const { data: scoreData, isLoading: isScoreLoading } = useGetScoreQuery();
  const { data: messagesByChannelData, isLoading: isMessagesByChannelLoading } = useGetMessagesByChannelQuery();
  const { data: messagesByMonthData, isLoading: isMessagesByMonthLoading } = useGetMessagesByMonthQuery();
  const { data: messagesByMonthByMemberData, isLoading: isMessagesByMonthByMemberLoading} = useGetMessagesByMonthByMemberQuery();

  return (
    <Box m="1.5rem"> 
      <Header title={"Dashboard"} subtitle={"Welcome to your Dashboard"}></Header>
      <Box 
        mt="20px" 
        display="grid"
        gridTemplateColumns="repeat(12,minmax(0, 1fr))"
        justifyContent="space-between"
        rowGap="20px"
        columnGap="20px"
        sx={{
            "& > div": {gridColumn: isNonMobile ? undefined : "span 12"}
        }}
        >
        {/* MessagesAreaChart */}
        <Grow in={isCardVisible} style={{ transformOrigin: '0 0 0' }}>
          <Card
            sx={{
              backgroundImage: "none",
              backgroundColor: theme.palette.background.alt,
              borderRadius: "0.55rem",
              gridColumn: 'span 10',
              gridRow: 'span 2',
              boxShadow: `0px 4px 8px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'}`,
          }}
          >
            <CardContent>
              <Typography sx={{ fontSize: 16 }} variant='h1' gutterBottom>
                <MessageRounded/> Messages
              </Typography>
              <Box height={300} width="100%">
                <MessagesAreaChart data={messagesByMonthData} isLoading={isMessagesByMonthLoading}/>
              </Box>
            </CardContent>
          </Card>
        </Grow>
        {/* StatBox */}
        <Grow in={isCardVisible} style={{ transformOrigin: '0 0 0' }}>
          <Card
            sx={{
              backgroundImage: "none",
              backgroundColor: theme.palette.background.alt,
              borderRadius: "0.55rem",
              gridColumn: 'span 2',
              gridRow: 'span 1',
              boxShadow: `0px 4px 8px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'}`,
            }}
            >
            <CardContent>
              <Typography sx={{ fontSize: 16 }} variant='h1' gutterBottom>
                <CalendarMonthRounded/> Yearly
              </Typography>
              <Typography variant='h2' gutterBottom>
                {emojiCountData?.emojiCount}
              </Typography>
            </CardContent>
          </Card> 
        </Grow> 
        {/* StatBox */}
        <Grow in={isCardVisible} style={{ transformOrigin: '0 0 0' }}>
          <Card
            sx={{
              backgroundImage: "none",
              backgroundColor: theme.palette.background.alt,
              borderRadius: "0.55rem",
              gridColumn: 'span 2',
              gridRow: 'span 1',
              boxShadow: `0px 4px 8px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'}`,
            }}
            >
            <CardContent>
              <Typography sx={{ fontSize: 16 }} variant='h1' gutterBottom>
                <CalendarTodayRounded/> Monthly
              </Typography>
              <Typography variant='h2' gutterBottom>
              </Typography>
            </CardContent>
          </Card> 
        </Grow> 
          {/* First Table */}
        <Grow in={isCardVisible} style={{ transformOrigin: '0 0 0' }}>
          <Card
            sx={{
              backgroundImage: "none",
              backgroundColor: theme.palette.background.alt,
              borderRadius: "0.55rem",
              gridColumn: 'span 6',
              gridRow: 'span 1',
              boxShadow: `0px 4px 8px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'}`,
            }}
            >
            <CardContent>
              <Typography sx={{ fontSize: 16 }} variant='h1' gutterBottom>
                <LeaderboardRounded/> Firsts
              </Typography>
              <FirstTable data={scoreData} isLoading={isScoreLoading} ></FirstTable>
            </CardContent>
          </Card>
        </Grow>

        {/* EmojiPieChart */}
        <Grow in={isCardVisible} style={{ transformOrigin: '0 0 0' }}>
          <Card
            sx={{
              backgroundImage: "none",
              backgroundColor: theme.palette.background.alt,
              borderRadius: "0.55rem",
              gridColumn: 'span 6',
              gridRow: 'span 1',
              boxShadow: `0px 4px 8px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'}`,
          }}
          >
            <CardContent>
              <Typography sx={{ fontSize: 16 }} variant='h1' justifyContent={'right'} gutterBottom>
                <LeaderboardRounded/> Emojis
              </Typography>
              <Box height={350} width="100%">
                <EmojiPieChart data={messagesByChannelData} isLoading={isMessagesByChannelLoading} />
              </Box>
            </CardContent>
          </Card>
        </Grow>

        {/* EmojiPieChart */}
        <Card
          sx={{
            backgroundImage: "none",
            backgroundColor: theme.palette.background.alt,
            borderRadius: "0.55rem",
            gridColumn: 'span 6',
            gridRow: 'span 1',
            boxShadow: `0px 4px 8px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'}`,
        }}
        >
          <CardContent>
            <Typography sx={{ fontSize: 16 }} variant='h1' justifyContent={'right'} gutterBottom>
              <LeaderboardRounded/> Emojis
            </Typography>
            <Box height={400} width="100%">
              {/* <EmojiPieChart data={emojiData} isLoading={isEmojiLoading} /> */}
            </Box>
          </CardContent>
        </Card>        
      </Box>
    </Box>
  )
}
export default Dashboard;

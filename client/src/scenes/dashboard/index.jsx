import React, { useState } from 'react';
import FirstTable from 'components/FirstTable';
import ChannelsPieChart from 'components/ChannelsPieChart';
import Header from "components/Header";
import StatBox from 'components/StatBox';
import MessagesAreaChart from 'components/MessagesAreaChart';
import { 
  useGetScoreQuery, 
  useGetMessagesByChannelQuery, 
  useGetMessagesByMonthQuery,
  useGetMessagesStatsQuery
} from "state/api";
import {
  Box,
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
  CalendarMonthRounded,
  CalendarTodayRounded,
  Tag,
  EmojiEmotions,
} from "@mui/icons-material";

const Dashboard = () => {

  const isCardVisible = true;
  const theme = useTheme();
  const isNonMobile = useMediaQuery("(min-width: 1400px)");
  const { data: scoreData, isLoading: isScoreLoading } = useGetScoreQuery();
  const { data: messagesStatsData, isLoading: isMessagesStatsLoading } = useGetMessagesStatsQuery();
  const { data: messagesByChannelData, isLoading: isMessagesByChannelLoading } = useGetMessagesByChannelQuery();
  const { data: messagesByMonthData, isLoading: isMessagesByMonthLoading } = useGetMessagesByMonthQuery();

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
          boxShadow: `0px 4px 8px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(78, 0, 204, 0.2)'}`,
          '&:hover': {
            boxShadow: `0px 8px 16px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(78, 0, 204, 0.2)'}`, // Adjust the box shadow on hover
            transitionDuration: '0.1s', // Adjust the transition duration for smoothness
          },
        }}
          >
            <CardContent>
              <Typography sx={{ fontSize: 16 }} variant='h1' gutterBottom>
                <MessageRounded sx={{ verticalAlign: 'middle' }}/> Messages
              </Typography>
              <Box height={300} width="100%">
                <MessagesAreaChart data={messagesByMonthData} isLoading={isMessagesByMonthLoading}/>
              </Box>
            </CardContent>
          </Card>
        </Grow>
        {/* StatBox */}
        <StatBox 
          title='Yearly'
          time='year'
          increase={23} 
          icon={<CalendarMonthRounded/>}
          description='Since last year'
          data={messagesStatsData}
          isLoading={isMessagesStatsLoading}
        />
        {/* StatBox */}
        <StatBox 
          title='Monthly'
          time='month'
          increase={-15}  
          icon={<CalendarTodayRounded/>}
          description='Since last month'
          data={messagesStatsData}
          isLoading={isMessagesStatsLoading}
        />
          {/* First Table */}
        <Grow in={isCardVisible} style={{ transformOrigin: '0 0 0' }}>
          <Card
            sx={{
              backgroundImage: "none",
              backgroundColor: theme.palette.background.alt,
              borderRadius: "0.55rem",
              gridColumn: 'span 8',
              gridRow: 'span 1',
              boxShadow: `0px 4px 8px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(78, 0, 204, 0.2)'}`,
              '&:hover': {
                boxShadow: `0px 8px 16px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(78, 0, 204, 0.2)'}`, // Adjust the box shadow on hover
              },
            }}
            >
            <CardContent>
              <Typography sx={{ fontSize: 16 }} variant='h1' gutterBottom>
                <LeaderboardRounded sx={{ verticalAlign: 'middle' }}/> Firsts
              </Typography>
              <FirstTable data={scoreData} isLoading={isScoreLoading} ></FirstTable>
            </CardContent>
          </Card>
        </Grow>

        {/* ChannelsPieChart */}
        <Grow in={isCardVisible} style={{ transformOrigin: '0 0 0' }}>
          <Card
            sx={{
              backgroundImage: "none",
              backgroundColor: theme.palette.background.alt,
              borderRadius: "0.55rem",
              gridColumn: 'span 4',
              gridRow: 'span 1',
              boxShadow: `0px 4px 8px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(78, 0, 204, 0.2)'}`,
              '&:hover': {
                boxShadow: `0px 8px 16px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(78, 0, 204, 0.2)'}`, // Adjust the box shadow on hover
              },
          }}
          >
            <CardContent>
              <Typography sx={{ fontSize: 16 }} variant='h1' justifyContent={'right'} gutterBottom>
                <Tag sx={{ verticalAlign: 'middle' }}/> Channels
              </Typography>
              <Box height={400} width={'100%'}>
                <ChannelsPieChart data={messagesByChannelData} isLoading={isMessagesByChannelLoading} />
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
              <EmojiEmotions sx={{ verticalAlign: 'middle' }}/> Emojis
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

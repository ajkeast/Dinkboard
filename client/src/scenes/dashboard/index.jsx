import React, { useState } from 'react';
import FirstTable from 'components/FirstTable';
import Header from "components/Header";
import { useGetScoreQuery } from "state/api";
import {
  Box,
  Button,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import FlexBetween from 'components/FlexBetween';

const Dashboard = () => {

  const theme = useTheme();
  const isNonMediumScreens = useMediaQuery("(min-width: 1200px)");
  const { data, isLoading } = useGetScoreQuery();
  console.log(process.env.SERVER_APP_BASE_URL)

  return (
    <Box m="1.5rem 2.5rem"> 
      <Header title={"Dashboard"} subtitle={"Welcome to your Dashboard"}></Header>
      <Box sx={{boxShadow: 5, borderRadius: 2,}}>
        <FirstTable data={data} isLoading={isLoading} ></FirstTable>
      </Box>
    </Box>
  )
}
export default Dashboard;

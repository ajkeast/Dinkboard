import React, { useState, PureComponent, useEffect } from 'react';
import { LineChart, LabelList, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush, ResponsiveContainer } from 'recharts';
import {
  Box,
  Card,
  CardActions,
  CardContent,
  Collapse,
  Button,
  Typography,
  Rating,
  useTheme,
  useMediaQuery,
  } from "@mui/material";
import Header from "components/Header";
import { useGetMessagesByDayByMemberQuery } from 'state/api';
import MessagesBarChart from 'components/MessagesBarChart';

const Messages = () => {
    const { data, isLoading } = useGetMessagesByDayByMemberQuery();

    return (
        <Box m="1.5rem 2.5rem" height="80%" width="95%">
            <Header title={"Messages"} subtitle={"Messages by members"}/>
            <MessagesBarChart data={data} isLoading={isLoading}/>
        </Box>
      )
    
}

export default Messages;
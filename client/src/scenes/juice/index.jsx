import React, { useState, useEffect } from 'react';
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
import JuiceAreaChart from 'components/JuiceAreaChart';
import { useGetJuiceQuery } from 'state/api';

const Juice = () => {
    const { data, isLoading } = useGetJuiceQuery();

    return (
        <Box m="1.5rem 2.5rem" height="30%" width="90%">
            <Header title={"Juice"} subtitle={"The pulse of server patience"}/>
            <JuiceAreaChart data={data} isLoading={isLoading}/>
        </Box>
    )
    
}

export default Juice;
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
import { useGetEmojisQuery } from 'state/api';
import EmojisDataGrid from 'components/EmojisDataGrid';

const Emojis = () => {
    const { data, isLoading } = useGetEmojisQuery();

    return (
        <Box m="1.5rem 2.5rem" height="100%" width="90%">
            <Header title={"Emojis"} subtitle={"All custom emojis on the server"}/>
            <EmojisDataGrid data={data} isLoading={isLoading}/>
        </Box>
    )
    
}

export default Emojis;
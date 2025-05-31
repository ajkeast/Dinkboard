import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardActions,
  CardContent,
  Grow,
  Collapse,
  Button,
  Typography,
  Rating,
  useTheme,
  useMediaQuery,
  } from "@mui/material";
import Header from "components/Header";
import JuiceAreaChart from 'components/JuiceAreaChart';
import DinksCard from 'components/DinkCard';
import { useGetJuiceQuery } from 'state/api';

const Juice = () => {
    const isNonMobile = useMediaQuery("(min-width: 1400px)");
    const theme = useTheme();
    const { data, isLoading } = useGetJuiceQuery();

    return (
        <Box>
                <Header title={"Juice"} subtitle={"The pulse of server patience"}/>
            <Box 
                m="1.5rem 2.5rem" 
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
                
                <Grow>
                    <DinksCard theme={theme}>
                        <CardContent>
                            <JuiceAreaChart data={data} isLoading={isLoading}/>
                        </CardContent>                       
                    </DinksCard>
                </Grow>    
            </Box>
        </Box>
    )
    
}

export default Juice;
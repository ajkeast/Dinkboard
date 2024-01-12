import React, { useState, PureComponent } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
import { useGetCumCountQuery } from 'state/api';


const FirstLeaderboard = () => {
  const { data, isLoading } = useGetCumCountQuery();
  return (
    <Box m="1.5rem 2.5rem">
      <Header title="Firsts" subtitle=""/>
      {data || !isLoading ? ("Loaded"
        // <LineChart
        //   width={500}
        //   height={300}
        //   data={data}
        //   margin={{
        //     top: 5,
        //     right: 30,
        //     left: 20,
        //     bottom: 5,
        //   }}
        // >
        //   <CartesianGrid strokeDasharray="3 3" />
        //   <XAxis dataKey="timesent" type="category"/>
        //   <YAxis dataKey="cum_count"/>
        //   <Tooltip />
        //   <Legend />
        //   {data.map((s) => (
        //     <Line dataKey="cum_count" name={s.user_name} key={s.user_name} />
        //   ))}
        //   {/* <Line type="monotone" dataKey="user_id" stroke="#82ca9d" /> */}
        // </LineChart>
      )
      :
      ("Loading")}
    </Box>
  )
}

export default FirstLeaderboard

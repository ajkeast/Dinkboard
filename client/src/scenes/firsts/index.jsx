import React, { useState, PureComponent, useEffect } from 'react';
import { AreaChart, LineChart, LabelList, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

function generatePurpleGradient(n) {
  const purpleGradient = [];

  for (let i = 0; i < n; i++) {
    // Calculate the lightness value based on the position in the gradient
    const lightness = (i / (n - 1)) * 100;

    // Create an HSL color string with a fixed hue for purple (you can adjust it if needed)
    const purpleShade = `hsl(275, 100%, ${lightness}%)`;

    // Add the color to the gradient array
    purpleGradient.push(purpleShade);
  }

  return purpleGradient;
}

const FirstLeaderboard = () => {
  const { data, isLoading } = useGetCumCountQuery();
  const [purpleShades, setPurpleShades] = useState([]);

  useEffect(() => {
    if (!isLoading && data) {
      // Call the generatePurpleGradient function when data is loaded
      const shades = generatePurpleGradient(data.length);
      setPurpleShades(shades);
    }
  }, [data, isLoading]);
  console.log(purpleShades)
  return (
    <Box m="1.5rem 2.5rem" height="80%" width="90%">
      <Header title="Firsts" subtitle=""/>
      {data || !isLoading ? (
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timesent" 
              type="number" 
              allowDuplicatedCategory={true}
              domain={[18980, 19760]}/>
            <YAxis dataKey="cum_count" />
            <Tooltip content={<p className="label">{`Test`}</p>}/>
            <Legend />
            {data.map((s,index) => (
              <Line 
                dataKey="cum_count" 
                data={s.data} 
                name={s.name} 
                key={s.name}
                type={'monotoneX'} 
                fill={purpleShades[index]}
                stroke={purpleShades[index]}
                strokeWidth={4}
                dot={false}
                line
                >
                  <LabelList dataKey={"name"}/>
                </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      )
      :
      ("Loading")}
    </Box>
  )
}

export default FirstLeaderboard

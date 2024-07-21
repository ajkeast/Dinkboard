import React, { useState, useEffect } from 'react';
import { LineChart, LabelList, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import {
  Box,
  } from "@mui/material";
import Header from "components/Header";
import { useGetCumCountQuery } from 'state/api';

function generateColorShades(n) {
  const colorGradient = [];
  for (let i = 0; i < n; i++) {
    // Calculate the hue value based on the position in the gradient
    const hue = (i / (n - 1)) * 360;
    // Create an HSL color string with a saturation and lightness
    const colorShade = `hsl(${hue}, 60%, 60%)`;
    // Add the color to the gradient array
    colorGradient.push(colorShade);
  }
  return colorGradient;
}

const Firsts = () => {
  const { data, isLoading } = useGetCumCountQuery();
  const [colorShades, setColorShades] = useState([]);

  useEffect(() => {
    if (!isLoading && data) {
      // Call the generateColorGradient function when data is loaded
      const shades = generateColorShades(data.length);
      setColorShades(shades);
    }
  }, [data, isLoading]);
  return (
    <Box m="1.5rem 2.5rem" height="80%" width="95%">
      <Header title="Firsts" subtitle="Cumulative count of firsts"/>
      {data && !isLoading ? (
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis 
              dataKey="timesent" 
              type="number" 
              allowDuplicatedCategory={true}
              domain={[18980, 19800]}/>
            <YAxis dataKey="cum_count" />
            {/* <Tooltip /> */}
            <Legend layout="vertical" verticalAlign="center" align="right" wrapperStyle={{padding: "1.5rem"}}/>
            {data.map((s,index) => (
              <Line 
                dataKey="cum_count" 
                data={s.data} 
                name={s.name} 
                key={s.name}
                type={'monotoneX'} 
                fill={colorShades[index]}
                stroke={colorShades[index]}
                strokeWidth={3}
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

export default Firsts

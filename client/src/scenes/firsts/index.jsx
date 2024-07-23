import React, { useState, useEffect } from 'react';
import { LineChart, LabelList, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { Box } from "@mui/material";
import Header from "components/Header";
import { useGetCumCountQuery } from 'state/api';

function generateColorShades(n) {
  const colorGradient = [];
  for (let i = 0; i < n; i++) {
    const hue = (i / (n - 1)) * 360;
    const colorShade = `hsl(${hue}, 60%, 60%)`;
    colorGradient.push(colorShade);
  }
  return colorGradient;
}

const formatDate = (unixTime) => {
  const date = new Date(unixTime * 1000);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short'});
};

const Firsts = () => {
  const { data, isLoading } = useGetCumCountQuery();
  const [colorShades, setColorShades] = useState([]);
  const [domain, setDomain] = useState([0, 0]);
  const [xAxisTicks, setXAxisTicks] = useState([]);

  useEffect(() => {
    if (!isLoading && data) {
      const shades = generateColorShades(data.length);
      setColorShades(shades);
      
      // Calculate the domain and ticks for the x-axis
      const allDates = data.flatMap(item => item.data.map(d => d.timesent));
      const minDate = Math.min(...allDates);
      const maxDate = Math.max(...allDates);
      setDomain([minDate, maxDate]);

      // Generate ticks (e.g., 12 evenly spaced ticks)
      const tickCount = 12;
      const step = (maxDate - minDate) / (tickCount - 1);
      const ticks = Array.from({ length: tickCount }, (_, i) => Math.round(minDate + step * i));
      setXAxisTicks(ticks);
    }
  }, [data, isLoading]);

  if (isLoading) {
    return (
      <Box m="1.5rem 2.5rem" height="80vh" width="95%">
        <Header title="Firsts" subtitle="Cumulative count of firsts"/>
        Loading...
      </Box>
    );
  }

  if (!data) {
    return (
      <Box m="1.5rem 2.5rem" height="80vh" width="95%">
        <Header title="Firsts" subtitle="Cumulative count of firsts"/>
        No data available.
      </Box>
    );
  }

  return (
    <Box m="1.5rem 2.5rem" height="80vh" width="95%">
      <Header title="Firsts" subtitle="Cumulative count of firsts"/>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid vertical={false} />
          <XAxis 
            dataKey="timesent" 
            type="number" 
            domain={domain}
            ticks={xAxisTicks}
            tickFormatter={formatDate}
            allowDataOverflow={true}
          />
          <YAxis 
            label={"Firsts"}
            />
          <Legend layout="vertical" verticalAlign="top" align="right" wrapperStyle={{padding: "1.5rem"}}/>
          {data.map((s, index) => (
            <Line 
              dataKey="cum_count" 
              data={s.data} 
              name={s.name} 
              key={s.name}
              type="monotoneX" 
              stroke={colorShades[index]}
              strokeWidth={2}
              dot={false}
            >
              <LabelList dataKey="name" position="right" />
            </Line>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default Firsts;
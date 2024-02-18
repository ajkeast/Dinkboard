import React, { PureComponent } from 'react';
import { Box, useTheme } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MessagesBarChart = ({ data, isLoading }) => {
    const theme = useTheme();
    const animationDuration = 1000;
    const animationBegin = 0
    // const COLORS = [useTheme.palette.secondary[300], '#4d2ea1', useTheme.palette.neutral[100], useTheme.palette.secondary[500]];
    console.log(data);
    if (!data || isLoading) (
        <Box>
            Loading...
        </Box>
    )

    else {
        return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: theme.palette.background.alt }} />
                <Legend />
                {/* {data.map((entry, index) => (} */}
                <Bar dataKey="samtyclaws" stackId="a" fill="rgb(92, 214, 92)" animationDuration={animationDuration} animationBegin={animationBegin} />
                <Bar dataKey="whikle :Moyogurt:" stackId="a" fill="rgb(92, 92, 214)" animationDuration={animationDuration} animationBegin={animationBegin}/>
                <Bar dataKey="jack :emoji_51:" stackId="a" fill="rgb(173, 92, 214)" animationDuration={animationDuration} animationBegin={animationBegin}/>
                <Bar dataKey="goatgoatgoatgoat" stackId="a" fill="rgb(92, 214, 173)" animationDuration={animationDuration} animationBegin={animationBegin}/>
                <Bar dataKey="Miguel" stackId="a" fill="rgb(92, 173, 214)" animationDuration={animationDuration} animationBegin={animationBegin}/>
                <Bar dataKey="Astro Keast" stackId="a" fill="rgb(214, 173, 92)" animationDuration={animationDuration} animationBegin={animationBegin}/>
                <Bar dataKey="Yogurt Male Mo 🐮" stackId="a" fill="rgb(214, 92, 92)" animationDuration={animationDuration} animationBegin={animationBegin}/>
                <Bar dataKey="Don Ho" stackId="a" fill="rgb(173, 214, 92)" animationDuration={animationDuration} animationBegin={animationBegin}/>
                <Bar dataKey="drewbeedoo" stackId="a" fill="rgb(214, 92, 173)" animationDuration={animationDuration} animationBegin={animationBegin}/>
            </BarChart>
        </ResponsiveContainer>
        )
    }
}

export default MessagesBarChart;
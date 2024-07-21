import React from 'react';
import { Box, useTheme } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const JuiceAreaChart = ({ data, isLoading }) => {
    const theme = useTheme();
    const animationDuration = 1600;
    const animationBegin = 0

    if (!data || isLoading) (
        <Box>
            Loading...
        </Box>
    )

    else {
        return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="secondary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="20%" stopColor={theme.palette.secondary[500]} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={theme.palette.secondary[500]} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis dataKey="eastern_timestamp" />
                <YAxis />
                <CartesianGrid vertical={false} strokeDasharray={"0"} />
                <Tooltip contentStyle={{ backgroundColor: theme.palette.background.alt }}/>
                <Area 
                    type="monotone" 
                    dataKey="juice" 
                    stroke={theme.palette.secondary[300]} 
                    fillOpacity={1} 
                    fill="url(#secondary)" 
                    animationDuration={animationDuration}
                    animationBegin={animationBegin}
                    />
            </AreaChart>
        </ResponsiveContainer>
        )
    }
}

export default JuiceAreaChart;
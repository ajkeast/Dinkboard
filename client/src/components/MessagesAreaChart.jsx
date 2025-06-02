import React from 'react';
import { Box, useTheme } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MessagesAreaChart = ({ data, isLoading }) => {
    const theme = useTheme();
    const animationDuration = 1600;
    const animationBegin = 0;
    // const COLORS = [useTheme.palette.secondary[300], '#4d2ea1', useTheme.palette.neutral[100], useTheme.palette.secondary[500]];

    if (!data || isLoading) {
        return (
            <Box>
                Loading...
            </Box>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="secondary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="20%" stopColor={theme.palette.secondary[500]} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={theme.palette.secondary[500]} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis dataKey="month" />
                <YAxis />
                <CartesianGrid vertical={false} strokeDasharray={"0"} />
                <Tooltip contentStyle={{ backgroundColor: theme.palette.background.alt }}/>
                <Area 
                    type="monotone" 
                    dataKey="messages" 
                    stroke={theme.palette.secondary[300]} 
                    fillOpacity={1} 
                    fill="url(#secondary)" 
                    animationDuration={animationDuration}
                    animationBegin={animationBegin}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

export default MessagesAreaChart;
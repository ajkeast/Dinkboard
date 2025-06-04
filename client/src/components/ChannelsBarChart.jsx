import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Box, useTheme } from '@mui/material';

const ChannelsBarChart = ({ data, isLoading }) => {
    const theme = useTheme();
    
    if (!data || isLoading) return (
        <Box>
            Loading...
        </Box>
    );

    // Sort data by messages in descending order
    const sortedData = [...data].sort((a, b) => b.messages - a.messages);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={sortedData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                    type="category" 
                    dataKey="channel_name" 
                    width={100}
                    tick={{ fill: theme.palette.neutral[100] }}
                />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: theme.palette.background.alt,
                        color: theme.palette.neutral[100]
                    }}
                />
                <Bar 
                    dataKey="messages" 
                    fill={theme.palette.secondary[300]}
                    animationDuration={1000}
                    animationBegin={0}
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default ChannelsBarChart; 
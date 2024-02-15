import React from 'react';
import { PieChart, Pie, Sector, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Box, useTheme} from '@mui/material';

const EmojiPieChart = ({ data, isLoading }) => {
  // Define columns for the DataGrid
    const theme = useTheme();
    const COLORS = [theme.palette.secondary[300], '#4d2ea1', theme.palette.neutral[100], theme.palette.secondary[500]];
    let renderLabel = function(entry) {
        if(entry.occurences > 1){
            return entry.emoji_name;
        }
    }
    if (!data || isLoading) return (
        <Box>
            Loading...
        </Box>
    )

    else { 
        return (
            <ResponsiveContainer>
                <PieChart >
                    <Pie
                        data={data}
                        innerRadius={120}
                        outerRadius={160}
                        fill="#8884d7"
                        stroke=""
                        paddingAngle={5}
                        nameKey="emoji_name"
                        dataKey="occurences"
                        label={renderLabel}
                        labelLine={false}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip/>
                </PieChart>
            </ResponsiveContainer>
        );
    };
}
export default EmojiPieChart;
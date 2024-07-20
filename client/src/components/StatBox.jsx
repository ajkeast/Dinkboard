import React from "react";
import { Card, CardContent, Grow, Typography, useTheme, Skeleton } from "@mui/material";
import FlexBetween from "./FlexBetween";
import { TrendingUpRounded, TrendingDownRounded } from "@mui/icons-material";

const StatBox = ({ title, time, icon, description, data, isLoading }) => {
  const theme = useTheme();
  
  if (isLoading || !data) {
    return (
      <Skeleton 
        variant="rectangular"
        animation="pulse" 
        height="100%" 
        sx={{ 
          backgroundImage: "none",
          backgroundColor: theme.palette.background.alt,
          borderRadius: "0.55rem",
          gridColumn: 'span 2',
          gridRow: 'span 1',
          boxShadow: `0px 4px 8px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(78, 0, 204, 0.2)'}`,
        }}
      />
    );
  }

  const change = time === 'month' ? (data[0].thisMTD / data[0].lastMTD - 1) : (data[0].thisYTD / data[0].lastYTD - 1);
  const value = time === 'month' ? data[0].thisMTD : data[0].thisYTD;

  return (
    
    <Grow in={true} style={{ transformOrigin: '0 0 0' }}>
      <Card
        sx={{
          backgroundImage: "none",
          backgroundColor: theme.palette.background.alt,
          borderRadius: "0.55rem",
          gridColumn: 'span 2',
          gridRow: 'span 1',
          boxShadow: `0px 4px 8px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(78, 0, 204, 0.2)'}`,
          '&:hover': {
            boxShadow: `0px 8px 16px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(78, 0, 204, 0.2)'}`, // Adjust the box shadow on hover
          },
        }}
      >
        <CardContent>
          <FlexBetween>
            <Typography variant="h5" >
              {title}
            </Typography>
            {icon}
          </FlexBetween>
          <Typography
            variant="h3"
            fontWeight="700"
            sx={{ 
              color: theme.palette.secondary[200], 
              paddingTop: "0.55rem",
              paddingBottom: "0.5rem",  
            }}
          >
            {value} 
          </Typography>
          <FlexBetween gap="1rem">
              <Typography
                variant="h4"
                fontWeight="700"
                sx={{
                  color: change > 0 ? theme.palette.green.default : theme.palette.red.default,
                  display: 'flex', // Ensures items are aligned in the flex container
                  alignItems: 'center', // Aligns items vertically in the center
                }}
                >
                {`${Math.round(change*100)}%`} {change > 0 ? <TrendingUpRounded sx={{fontSize:"32px"}}/> : <TrendingDownRounded sx={{fontSize:"32px"}}/>}
              </Typography>
              <Typography variant="h6">
                {description}
              </Typography>
          </FlexBetween>
        </CardContent>
      </Card>
    </Grow>
  );
};

export default StatBox;
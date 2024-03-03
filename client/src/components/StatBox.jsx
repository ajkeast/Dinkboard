import React from "react";
import { Card, CardContent, Grow, Typography, useTheme } from "@mui/material";
import FlexBetween from "./FlexBetween";

const StatBox = ({ title, value, increase, icon, description }) => {
  const theme = useTheme();
  return (
    <Grow in={true} style={{ transformOrigin: '0 0 0' }}>
      <Card
        sx={{
          backgroundImage: "none",
          backgroundColor: theme.palette.background.alt,
          borderRadius: "0.55rem",
          gridColumn: 'span 2',
          gridRow: 'span 1',
          boxShadow: `0px 4px 8px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'}`,
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
            fontWeight="600"
            sx={{ color: theme.palette.secondary[200] }}
          >
            {value}
          </Typography>
          <FlexBetween gap="1rem">
              <Typography
                variant="h5"
                fontStyle="italic"
                sx={{ color: theme.palette.secondary.light }}
                >
                {increase}
              </Typography>
              <Typography>
                {description}
              </Typography>
          </FlexBetween>
        </CardContent>
      </Card>
    </Grow>
  );
};

export default StatBox;
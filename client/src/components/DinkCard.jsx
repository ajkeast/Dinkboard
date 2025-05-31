import React from 'react';
import { Card, useTheme } from '@mui/material';
import { styled } from "@mui/system";

const DinksCard = styled(Card)(({ theme }) => ({
    backgroundImage: "none",
    backgroundColor: theme.palette.background.alt,
    borderRadius: "0.55rem",
    gridColumn: 'span 10',
    gridRow: 'span 2',
    boxShadow: `0px 4px 8px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(78, 0, 204, 0.2)'}`,
    '&:hover': {
        boxShadow: `0px 8px 16px ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(78, 0, 204, 0.2)'}`,
        transitionDuration: '0.1s',
    },
}));

export default DinksCard;
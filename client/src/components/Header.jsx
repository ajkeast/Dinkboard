import { Typography, Box, useTheme } from "@mui/material";
import React from "react";

const Header = ({ title, subtitle }) => {
  const theme = useTheme();
  return (
    <Box>
      <Typography
        variant="h4"
        color={
          theme.palette.mode === "dark"
            ? theme.palette.secondary[100]
            : theme.palette.grey[900]
        }
        fontWeight="bold"
        sx={{ mb: 0.25 }}
      >
        {title}
      </Typography>
      <Typography
        variant="body2"
        color={
          theme.palette.mode === "dark"
            ? theme.palette.secondary[200]
            : theme.palette.grey[700]
        }
      >
        {subtitle}
      </Typography>
    </Box>
  );
};

export default Header;

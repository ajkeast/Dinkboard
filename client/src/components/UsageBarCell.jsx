import React from "react";
import { Box, Typography, useTheme } from "@mui/material";

/** Numeric value + relative bar for scannable comparison in tables. */
const UsageBarCell = ({ value, max, minWidth = 40 }) => {
  const theme = useTheme();
  const pct = max > 0 ? Math.max(2, (Number(value ?? 0) / max) * 100) : 0;

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={1.25}
      width="100%"
      minWidth={0}
      pr={0.5}
    >
      <Typography
        variant="body2"
        color="text.primary"
        sx={{
          minWidth,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {Number(value ?? 0).toLocaleString()}
      </Typography>
      <Box
        flex={1}
        minWidth={48}
        height={6}
        borderRadius={1}
        overflow="hidden"
        bgcolor={
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.08)"
        }
      >
        <Box
          height="100%"
          width={`${pct}%`}
          borderRadius={1}
          bgcolor={theme.palette.secondary.main}
          sx={{ transition: "width 200ms ease" }}
        />
      </Box>
    </Box>
  );
};

export default UsageBarCell;

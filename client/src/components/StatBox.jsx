import React from "react";
import {
  Box,
  CardContent,
  Typography,
  useTheme,
} from "@mui/material";
import DashCard from "./DashCard";
import FlexBetween from "./FlexBetween";
import { StatSkeleton } from "./skeletons/DashSkeleton";
import { TrendingUpRounded, TrendingDownRounded } from "@mui/icons-material";
import { formatCompact } from "utils/chartTheme";

/**
 * Stats may arrive as a 1-element array (messages/stats) or a plain object.
 */
const normalizeStats = (data) => {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data;
};

const defaultPlacement = {
  gridColumn: { xs: "span 12", sm: "span 6", md: "span 4", xl: "span 2" },
  gridRow: "span 1",
};

const StatBox = ({
  title,
  time,
  icon,
  description,
  data,
  isLoading,
  error,
  sx = {},
}) => {
  const theme = useTheme();
  const stats = normalizeStats(data);
  const placement = { ...defaultPlacement, ...sx };

  if (isLoading) {
    return <StatSkeleton sx={placement} />;
  }

  if (error || !stats) {
    return (
      <DashCard sx={{ ...placement, minHeight: 112 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            {error ? "Unavailable" : "No data"}
          </Typography>
        </CardContent>
      </DashCard>
    );
  }

  const change =
    time === "month"
      ? stats.lastMTD
        ? stats.thisMTD / stats.lastMTD - 1
        : 0
      : stats.lastYTD
        ? stats.thisYTD / stats.lastYTD - 1
        : 0;
  const value = time === "month" ? stats.thisMTD : stats.thisYTD;

  return (
    <DashCard sx={placement}>
      <CardContent>
        <FlexBetween>
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
          {icon}
        </FlexBetween>
        <Typography
          variant="h4"
          fontWeight="700"
          sx={{
            color:
              theme.palette.mode === "dark"
                ? theme.palette.secondary[200]
                : theme.palette.secondary[600],
            pt: 0.75,
            pb: 0.5,
          }}
        >
          {formatCompact(value)}
        </Typography>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
          flexWrap="wrap"
          mt={0.25}
        >
          <Typography
            variant="body2"
            fontWeight="700"
            sx={{
              color:
                change > 0
                  ? theme.palette.green.default
                  : theme.palette.red.default,
              display: "flex",
              alignItems: "center",
              gap: 0.25,
            }}
          >
            {`${Math.round(change * 100)}%`}{" "}
            {change > 0 ? (
              <TrendingUpRounded sx={{ fontSize: 20 }} />
            ) : (
              <TrendingDownRounded sx={{ fontSize: 20 }} />
            )}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ lineHeight: 1.3 }}
          >
            {description}
          </Typography>
        </Box>
      </CardContent>
    </DashCard>
  );
};

export default StatBox;

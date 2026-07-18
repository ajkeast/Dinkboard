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
export const normalizeStats = (data) => {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data;
};

export const resolveMetric = (stats, time) => {
  if (!stats) return { value: 0, change: 0 };
  const change =
    time === "month"
      ? stats.lastMTD
        ? stats.thisMTD / stats.lastMTD - 1
        : 0
      : stats.lastYTD
        ? stats.thisYTD / stats.lastYTD - 1
        : 0;
  const value = time === "month" ? stats.thisMTD : stats.thisYTD;
  return { value, change };
};

const defaultPlacement = {
  gridColumn: { xs: "span 12", sm: "span 6", md: "span 4", xl: "span 2" },
  gridRow: "span 1",
};

const TrendLabel = ({ change, size = 20 }) => {
  const theme = useTheme();
  const up = change > 0;

  return (
    <Typography
      variant="body2"
      fontWeight={700}
      sx={{
        color: up ? theme.palette.green.default : theme.palette.red.default,
        display: "inline-flex",
        alignItems: "center",
        gap: 0.25,
        whiteSpace: "nowrap",
      }}
    >
      {`${Math.round(change * 100)}%`}
      {up ? (
        <TrendingUpRounded sx={{ fontSize: size }} />
      ) : (
        <TrendingDownRounded sx={{ fontSize: size }} />
      )}
    </Typography>
  );
};

const valueColor = (theme) => theme.palette.text.primary;

const DefaultBody = ({ title, icon, value, change, description, theme }) => (
  <CardContent>
    <FlexBetween>
      <Typography variant="subtitle1" fontWeight={600}>
        {title}
      </Typography>
      {icon}
    </FlexBetween>
    <Typography
      variant="h4"
      fontWeight={700}
      sx={{ color: valueColor(theme), pt: 0.75, pb: 0.5 }}
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
      <TrendLabel change={change} />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ lineHeight: 1.3 }}
      >
        {description}
      </Typography>
    </Box>
  </CardContent>
);

const CompactBody = ({ title, icon, value, change, description, theme }) => (
  <CardContent sx={{ py: 1.25, px: 1.5, "&:last-child": { pb: 1.25 } }}>
    <FlexBetween mb={0.5}>
      <Typography
        variant="caption"
        fontWeight={600}
        color="text.secondary"
        sx={{
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </Typography>
      {icon && (
        <Box
          sx={{
            color: "text.secondary",
            display: "flex",
            "& svg": { fontSize: 16 },
          }}
        >
          {icon}
        </Box>
      )}
    </FlexBetween>
    <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap">
      <Typography
        variant="h5"
        fontWeight={700}
        sx={{ color: valueColor(theme), lineHeight: 1.2 }}
      >
        {formatCompact(value)}
      </Typography>
      <TrendLabel change={change} size={16} />
    </Box>
    <Typography
      variant="caption"
      color="text.secondary"
      display="block"
      mt={0.5}
      sx={{ lineHeight: 1.3 }}
    >
      {description}
    </Typography>
  </CardContent>
);

const InlineBody = ({ title, icon, value, change, description, theme }) => (
  <CardContent
    sx={{
      py: 1,
      px: 1.5,
      "&:last-child": { pb: 1 },
      display: "flex",
      alignItems: "center",
      gap: 1.25,
      minHeight: 52,
    }}
  >
    {icon && (
      <Box
        sx={{
          color: "text.secondary",
          display: "flex",
          flexShrink: 0,
          "& svg": { fontSize: 18 },
        }}
      >
        {icon}
      </Box>
    )}
    <Typography
      variant="body2"
      fontWeight={600}
      color="text.secondary"
      noWrap
      sx={{ flexShrink: 0 }}
    >
      {title}
    </Typography>
    <Typography
      variant="h6"
      fontWeight={700}
      noWrap
      sx={{ color: valueColor(theme), flexShrink: 0 }}
    >
      {formatCompact(value)}
    </Typography>
    <TrendLabel change={change} size={16} />
    <Typography
      variant="caption"
      color="text.secondary"
      noWrap
      sx={{ ml: "auto", minWidth: 0 }}
    >
      {description}
    </Typography>
  </CardContent>
);

/** Content-only metric for use inside StatStrip (no card chrome). */
export const StatStripItem = ({
  title,
  time = "month",
  icon,
  description,
  data,
  isLoading,
  error,
  sx = {},
}) => {
  const theme = useTheme();
  const stats = normalizeStats(data);

  const cellSx = {
    flex: "1 1 0",
    minWidth: 0,
    px: { xs: 1, sm: 1.5 },
    py: 1.25,
    ...sx,
  };

  if (isLoading) {
    return (
      <Box sx={cellSx}>
        <Box
          sx={{
            height: 10,
            width: "40%",
            mb: 1,
            borderRadius: 1,
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.08)",
          }}
        />
        <Box
          sx={{
            height: 22,
            width: "55%",
            borderRadius: 1,
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.08)",
          }}
        />
      </Box>
    );
  }

  if (error || !stats) {
    return (
      <Box sx={cellSx}>
        <Typography variant="caption" fontWeight={600} color="text.secondary" noWrap>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          {error ? "Unavailable" : "No data"}
        </Typography>
      </Box>
    );
  }

  const { value, change } = resolveMetric(stats, time);

  return (
    <Box sx={cellSx}>
      <Box display="flex" alignItems="center" gap={0.5} mb={0.5} minWidth={0}>
        {icon && (
          <Box
            sx={{
              color: "text.secondary",
              display: "flex",
              flexShrink: 0,
              "& svg": { fontSize: 16 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          variant="caption"
          fontWeight={600}
          color="text.secondary"
          noWrap
          sx={{ letterSpacing: "0.04em", textTransform: "uppercase", minWidth: 0 }}
        >
          {title}
        </Typography>
      </Box>
      <Box display="flex" alignItems="baseline" gap={0.75} flexWrap="nowrap" minWidth={0}>
        <Typography
          variant="h5"
          fontWeight={700}
          noWrap
          sx={{ color: valueColor(theme), lineHeight: 1.2 }}
        >
          {formatCompact(value)}
        </Typography>
        <TrendLabel change={change} size={16} />
      </Box>
      {description && (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          noWrap
          mt={0.5}
          title={description}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
};

/**
 * @param {"default" | "compact" | "inline"} [variant]
 */
const StatBox = ({
  title,
  time,
  icon,
  description,
  data,
  isLoading,
  error,
  sx = {},
  variant = "default",
}) => {
  const theme = useTheme();
  const stats = normalizeStats(data);
  const placement = { ...defaultPlacement, ...sx };

  if (isLoading) {
    return (
      <StatSkeleton
        sx={{
          ...placement,
          ...(variant === "inline" ? { minHeight: 52 } : {}),
          ...(variant === "compact" ? { minHeight: 88 } : {}),
        }}
      />
    );
  }

  if (error || !stats) {
    return (
      <DashCard
        sx={{
          ...placement,
          minHeight: variant === "inline" ? 52 : 112,
        }}
      >
        <CardContent sx={variant === "inline" ? { py: 1, "&:last-child": { pb: 1 } } : undefined}>
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={variant === "inline" ? 0 : 1}>
            {error ? "Unavailable" : "No data"}
          </Typography>
        </CardContent>
      </DashCard>
    );
  }

  const { value, change } = resolveMetric(stats, time);
  const bodyProps = { title, icon, value, change, description, theme };

  return (
    <DashCard sx={placement}>
      {variant === "compact" && <CompactBody {...bodyProps} />}
      {variant === "inline" && <InlineBody {...bodyProps} />}
      {variant === "default" && <DefaultBody {...bodyProps} />}
    </DashCard>
  );
};

export default StatBox;

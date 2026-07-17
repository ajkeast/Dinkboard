import React from "react";
import { Box, useTheme } from "@mui/material";
import DashCard from "../DashCard";

const bone = (theme) => ({
  backgroundColor:
    theme.palette.mode === "dark"
      ? "rgba(255, 255, 255, 0.06)"
      : "rgba(0, 0, 0, 0.06)",
  borderRadius: theme.shape.borderRadius,
  "@keyframes dinkPulse": {
    "0%": { opacity: 1 },
    "50%": { opacity: 0.45 },
    "100%": { opacity: 1 },
  },
  animation: "dinkPulse 1.4s ease-in-out infinite",
});

const Bone = ({ sx = {}, ...rest }) => {
  const theme = useTheme();
  return <Box sx={{ ...bone(theme), ...sx }} {...rest} />;
};

/** Chart plot area: axes + series placeholder. */
export const ChartSkeleton = ({ height = 280, variant = "area" }) => {
  const theme = useTheme();
  const h = typeof height === "number" ? height : 280;

  return (
    <Box
      height={height}
      width="100%"
      minHeight={typeof height === "number" ? height : 320}
      display="flex"
      gap={1}
      sx={{ borderRadius: theme.shape.borderRadius }}
    >
      <Bone sx={{ width: 28, alignSelf: "stretch", flexShrink: 0 }} />
      <Box flex={1} display="flex" flexDirection="column" minWidth={0} gap={1}>
        <Box flex={1} position="relative" minHeight={0}>
          {variant === "bars" ? (
            <Box
              display="flex"
              flexDirection="column"
              height="100%"
              minHeight={0}
              gap={1}
            >
              <Box
                display="flex"
                alignItems="flex-end"
                flex={1}
                minHeight={0}
                gap="3%"
                px="1%"
              >
                {[42, 68, 35, 82, 54, 71, 38, 90, 48, 63, 44, 76].map(
                  (pct, i) => (
                    <Box
                      key={i}
                      flex={1}
                      height={`${pct}%`}
                      display="flex"
                      flexDirection="column"
                      justifyContent="flex-end"
                      gap="2px"
                    >
                      <Bone sx={{ height: "28%", width: "100%" }} />
                      <Bone sx={{ height: "22%", width: "100%" }} />
                      <Bone sx={{ height: "35%", width: "100%" }} />
                      <Bone sx={{ height: "15%", width: "100%" }} />
                    </Box>
                  )
                )}
              </Box>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Bone key={i} sx={{ height: 10, width: 56 }} />
                ))}
              </Box>
            </Box>
          ) : variant === "pie" ? (
            <Box
              height="100%"
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={2}
            >
              <Bone
                sx={{
                  width: Math.min(h * 0.55, 160),
                  height: Math.min(h * 0.55, 160),
                  borderRadius: "50%",
                }}
              />
              <Box display="flex" flexDirection="column" gap={1} width={120}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Bone key={i} sx={{ height: 12, width: `${70 + i * 5}%` }} />
                ))}
              </Box>
            </Box>
          ) : (
            <>
              <Bone
                sx={{
                  position: "absolute",
                  inset: "12% 4% 18% 0",
                  clipPath:
                    "polygon(0% 70%, 12% 55%, 24% 62%, 36% 40%, 48% 48%, 60% 30%, 72% 38%, 84% 22%, 100% 28%, 100% 100%, 0% 100%)",
                }}
              />
              {[20, 45, 70].map((top) => (
                <Box
                  key={top}
                  sx={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: `${top}%`,
                    borderTop: `1px dashed ${
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.08)"
                    }`,
                  }}
                />
              ))}
            </>
          )}
        </Box>
        <Bone sx={{ height: 10, width: "100%" }} />
      </Box>
    </Box>
  );
};

/** Stat card placeholder matching StatBox layout. */
export const StatSkeleton = ({ sx = {} }) => (
  <DashCard sx={{ minHeight: 112, ...sx }}>
    <Box p={1.5}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Bone sx={{ height: 14, width: "42%" }} />
        <Bone sx={{ height: 20, width: 20 }} />
      </Box>
      <Bone sx={{ height: 28, width: "55%", mt: 1.25 }} />
      <Box display="flex" justifyContent="space-between" mt={1.25} gap={1}>
        <Bone sx={{ height: 14, width: "28%" }} />
        <Bone sx={{ height: 12, width: "36%" }} />
      </Box>
    </Box>
  </DashCard>
);

/** Table / DataGrid placeholder. */
export const TableSkeleton = ({
  rows = 6,
  columns = 3,
  height,
  sx = {},
}) => {
  const theme = useTheme();
  const colFlex = Array.from({ length: columns }, (_, i) =>
    i === 0 ? 1.4 : 0.8
  );

  return (
    <Box
      width="100%"
      height={height}
      minHeight={height ? undefined : 200}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius,
        overflow: "hidden",
        ...sx,
      }}
    >
      <Box
        display="flex"
        gap={1.5}
        px={1.5}
        py={1}
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor:
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.03)"
              : "rgba(0,0,0,0.03)",
        }}
      >
        {colFlex.map((flex, i) => (
          <Bone key={i} sx={{ height: 12, flex }} />
        ))}
      </Box>
      {Array.from({ length: rows }).map((_, row) => (
        <Box
          key={row}
          display="flex"
          gap={1.5}
          px={1.5}
          py={1.1}
          sx={{
            borderBottom:
              row < rows - 1
                ? `1px solid ${theme.palette.divider}`
                : "none",
          }}
        >
          {colFlex.map((flex, i) => (
            <Bone
              key={i}
              sx={{
                height: 12,
                flex,
                width: i === 0 ? undefined : "70%",
                maxWidth: i === 0 ? undefined : "80%",
              }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
};

/** Member profile card placeholder. */
export const MemberCardSkeleton = () => (
  <DashCard>
    <Box p={1.5}>
      <Bone sx={{ height: 12, width: "36%", mb: 1 }} />
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Bone sx={{ height: 16, width: "48%" }} />
        <Bone sx={{ height: 64, width: 64, borderRadius: "50%" }} />
      </Box>
      <Box display="flex" justifyContent="space-between" mt={2} gap={1}>
        {[1, 2, 3].map((i) => (
          <Bone key={i} sx={{ height: 44, flex: 1 }} />
        ))}
      </Box>
      <Bone sx={{ height: 12, width: "22%", mt: 1.5 }} />
    </Box>
  </DashCard>
);

/** Panel with fake title + chart body (for card interiors). */
export const PanelSkeleton = ({
  height = 280,
  chartVariant = "area",
  showTitle = true,
}) => (
  <Box width="100%">
    {showTitle && <Bone sx={{ height: 16, width: "28%", mb: 1.5 }} />}
    <ChartSkeleton height={height} variant={chartVariant} />
  </Box>
);

export default {
  ChartSkeleton,
  StatSkeleton,
  TableSkeleton,
  MemberCardSkeleton,
  PanelSkeleton,
};

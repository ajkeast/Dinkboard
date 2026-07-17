import React from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import { getApiErrorMessage } from "state/api";
import { ChartSkeleton, TableSkeleton } from "./skeletons/DashSkeleton";

/**
 * Shared loading / error / empty wrapper for RTK Query consumers.
 * Pass `skeleton` for a custom placeholder, or `skeletonVariant` for a built-in.
 *
 * Prefer `isLoading={isLoading || (isFetching && !data)}` so slow refetches /
 * first paints still show a skeleton when cache is empty.
 */
const QueryState = ({
  isLoading,
  error,
  isEmpty = false,
  emptyMessage = "No data available",
  onRetry,
  skeleton,
  skeletonVariant = "chart",
  skeletonHeight = 280,
  children,
}) => {
  if (isLoading) {
    const fillParent = typeof skeletonHeight !== "number";
    const shellSx = fillParent
      ? { height: "100%", width: "100%", minHeight: 320 }
      : { height: skeletonHeight, width: "100%", minHeight: skeletonHeight };

    if (skeleton) {
      return <Box sx={shellSx}>{skeleton}</Box>;
    }

    if (skeletonVariant === "table") {
      return (
        <Box sx={shellSx}>
          <TableSkeleton
            rows={fillParent ? 14 : 6}
            columns={3}
            height="100%"
          />
        </Box>
      );
    }

    const chartVariant =
      skeletonVariant === "bars" || skeletonVariant === "pie"
        ? skeletonVariant
        : "area";

    return (
      <Box sx={shellSx}>
        <ChartSkeleton height="100%" variant={chartVariant} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          ) : null
        }
        sx={{ width: "100%" }}
      >
        {getApiErrorMessage(error)}
      </Alert>
    );
  }

  if (isEmpty) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight={typeof skeletonHeight === "number" ? skeletonHeight : 280}
        height={typeof skeletonHeight === "number" ? undefined : "100%"}
        width="100%"
      >
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return children;
};

export default QueryState;

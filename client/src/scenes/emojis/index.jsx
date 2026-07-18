import React from "react";
import { Box, CardContent } from "@mui/material";
import Header from "components/Header";
import DashCard from "components/DashCard";
import { useGetEmojisQuery } from "state/api";
import EmojisDataGrid from "components/EmojisDataGrid";
import QueryState from "components/QueryState";
import { TableSkeleton } from "components/skeletons/DashSkeleton";

const Emojis = () => {
  const { data, error, refetch } = useGetEmojisQuery();
  const showSkeleton = !Array.isArray(data) && !error;

  return (
    <Box height={{ xs: "70vh", md: "80vh" }} width="100%">
      <Header title="Emojis" subtitle="All custom emojis on the server" />
      <DashCard
        sx={{
          mt: 1.5,
          height: "calc(100% - 64px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <CardContent
          sx={{
            flex: 1,
            minHeight: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            "&:last-child": { pb: 1.5 },
          }}
        >
          <Box flex={1} minHeight={320} width="100%" height="100%">
            <QueryState
              isLoading={showSkeleton}
              error={error}
              isEmpty={!showSkeleton && (!data || data.length === 0)}
              emptyMessage="No emojis found"
              onRetry={refetch}
              skeleton={
                <TableSkeleton rows={14} columns={3} height="100%" />
              }
              skeletonHeight="100%"
            >
              <EmojisDataGrid data={data} isLoading={false} />
            </QueryState>
          </Box>
        </CardContent>
      </DashCard>
    </Box>
  );
};

export default Emojis;

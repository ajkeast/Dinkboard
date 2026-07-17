import React from "react";
import { Box, CardContent } from "@mui/material";
import Header from "components/Header";
import DashCard from "components/DashCard";
import { useGetMessagesByMonthByMemberQuery } from "state/api";
import MessagesBarChart from "components/MessagesBarChart";

const Messages = () => {
  const { data, error, refetch } = useGetMessagesByMonthByMemberQuery();

  // Keep the card skeleton up until we have a payload or an error. Relying on
  // isLoading alone misses the slow first paint / remount cases.
  const showSkeleton = !Array.isArray(data) && !error;

  return (
    <Box height={{ xs: "70vh", md: "80vh" }} width="100%">
      <Header title="Messages" subtitle="Messages by members" />
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
            <MessagesBarChart
              data={data}
              isLoading={showSkeleton}
              error={error}
              onRetry={refetch}
            />
          </Box>
        </CardContent>
      </DashCard>
    </Box>
  );
};

export default Messages;

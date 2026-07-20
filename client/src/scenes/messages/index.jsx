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
    // Fixed vh clips the legend under iOS browser chrome; grow on mobile.
    // Flex column lets the Header size itself — no magic header-height calc.
    <Box
      width="100%"
      sx={{
        display: "flex",
        flexDirection: "column",
        height: { xs: "auto", md: "80vh" },
        minHeight: { xs: "70dvh", md: 0 },
      }}
    >
      <Header
        title="Messages"
        subtitle="Last 12 months by member · top volume"
      />
      <DashCard
        sx={{
          mt: 1.5,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <CardContent
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            "&:last-child": {
              pb: {
                xs: "max(16px, env(safe-area-inset-bottom))",
                md: 1.5,
              },
            },
          }}
        >
          <Box flex={1} minHeight={{ xs: "auto", md: 0 }} width="100%">
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

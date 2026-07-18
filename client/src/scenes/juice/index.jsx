import React from "react";
import { Box, CardContent } from "@mui/material";
import Header from "components/Header";
import JuiceAreaChart from "components/JuiceAreaChart";
import DashCard from "components/DashCard";
import { useGetJuiceQuery } from "state/api";

const Juice = () => {
  const { data, isLoading, error, refetch } = useGetJuiceQuery();

  return (
    <Box height={{ xs: "70vh", md: "80vh" }} width="100%">
      <Header title="Juice" subtitle="The pulse of server patience" />
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
            <JuiceAreaChart
              data={data}
              isLoading={isLoading}
              error={error}
              onRetry={refetch}
            />
          </Box>
        </CardContent>
      </DashCard>
    </Box>
  );
};

export default Juice;

import React from "react";
import { Box, CardContent } from "@mui/material";
import Header from "components/Header";
import JuiceAreaChart from "components/JuiceAreaChart";
import DashCard from "components/DashCard";
import { useGetJuiceQuery } from "state/api";

const Juice = () => {
  const { data, isLoading, error, refetch } = useGetJuiceQuery();

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
      <Header title="Juice" subtitle="The pulse of server patience" />
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

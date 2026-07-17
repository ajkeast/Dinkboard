import React from "react";
import { Box, CardContent } from "@mui/material";
import Header from "components/Header";
import JuiceAreaChart from "components/JuiceAreaChart";
import DashCard from "components/DashCard";
import { useGetJuiceQuery } from "state/api";

const Juice = () => {
  const { data, isLoading, error, refetch } = useGetJuiceQuery();

  return (
    <Box>
      <Header title="Juice" subtitle="The pulse of server patience" />
      <Box
        mt={1.5}
        display="grid"
        gridTemplateColumns="repeat(12, minmax(0, 1fr))"
        gap={1.5}
      >
        <DashCard sx={{ gridColumn: "span 12", gridRow: "span 2" }}>
          <CardContent>
            <Box height={{ xs: 320, md: 420 }} width="100%">
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
    </Box>
  );
};

export default Juice;

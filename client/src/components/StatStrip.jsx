import React from "react";
import { Box, Divider } from "@mui/material";
import DashCard from "./DashCard";
import { StatStripItem } from "./StatBox";

/**
 * Segmented KPI bar: one card, multiple stats separated by dividers.
 * Stays horizontal; scrolls only if items truly cannot fit.
 */
const StatStrip = ({ items = [], sx = {} }) => (
  <DashCard sx={{ width: "100%", ...sx }}>
    <Box
      display="flex"
      flexDirection="row"
      alignItems="stretch"
      sx={{
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
      divider={<Divider orientation="vertical" flexItem />}
    >
      {items.map((item) => (
        <StatStripItem key={item.title} {...item} />
      ))}
    </Box>
  </DashCard>
);

export default StatStrip;

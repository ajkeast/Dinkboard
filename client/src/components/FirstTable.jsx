import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, useTheme } from "@mui/material";
import QueryState from "./QueryState";
import { TableSkeleton } from "./skeletons/DashSkeleton";
import { dataGridSx } from "utils/dataGridSx";

const FirstTable = ({ data, isLoading, error, onRetry }) => {
  const theme = useTheme();
  const columns = [
    {
      field: "user_name",
      headerName: "Name",
      flex: 1.4,
      minWidth: 100,
      headerClassName: "first-table-column-header",
    },
    {
      field: "firsts",
      headerName: "Firsts",
      flex: 0.7,
      minWidth: 72,
      type: "number",
      align: "right",
      headerAlign: "right",
      headerClassName: "first-table-column-header",
    },
    {
      field: "days_since_first",
      headerName: "Days",
      description: "Days since first",
      flex: 0.7,
      minWidth: 64,
      type: "number",
      align: "right",
      headerAlign: "right",
      headerClassName: "first-table-column-header",
    },
  ];

  if (error) {
    return (
      <QueryState
        isLoading={false}
        error={error}
        onRetry={onRetry}
        skeletonHeight={200}
      />
    );
  }

  if (!data || isLoading) {
    return <TableSkeleton rows={5} columns={3} height={220} />;
  }

  if (data.length === 0) {
    return (
      <QueryState
        isLoading={false}
        isEmpty
        emptyMessage="No firsts scores yet"
        skeletonHeight={200}
      />
    );
  }

  const rows = data.map((item, index) => ({
    id: index + 1,
    user_name: item.user_name,
    firsts: item.firsts,
    days_since_first: item.days_since_first,
  }));

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: { paginationModel: { pageSize: 5 } },
        }}
        autoHeight
        density="compact"
        disableColumnMenu
        sx={dataGridSx(theme)}
      />
    </Box>
  );
};

export default FirstTable;

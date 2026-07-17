import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, useTheme } from "@mui/material";
import { TableSkeleton } from "./skeletons/DashSkeleton";
import { dataGridSx } from "utils/dataGridSx";

const EmojisDataGrid = ({ data, isLoading }) => {
  const theme = useTheme();
  const columns = [
    {
      field: "url",
      headerName: "Icon",
      width: 72,
      sortable: false,
      headerClassName: "emoji-table-column-header",
      renderCell: (params) => (
        <img
          src={params.value}
          alt="Icon"
          style={{ width: "30px", height: "30px" }}
        />
      ),
    },
    {
      field: "emoji_name",
      headerName: "Name",
      flex: 2,
      minWidth: 120,
      headerClassName: "emoji-table-column-header",
    },
    {
      field: "occurrences",
      headerName: "Occurrences",
      flex: 1.2,
      minWidth: 110,
      type: "number",
      align: "right",
      headerAlign: "right",
      headerClassName: "emoji-table-column-header",
    },
    {
      field: "created_at",
      headerName: "Created on",
      flex: 1.4,
      minWidth: 120,
      headerClassName: "emoji-table-column-header",
    },
  ];

  if (!data || isLoading) {
    return (
      <Box height="100%">
        <TableSkeleton rows={10} columns={4} height="100%" />
      </Box>
    );
  }

  const rows = data.map((item, index) => ({
    id: index + 1,
    emoji_name: item.emoji_name,
    occurrences: item.occurrences,
    created_at: item.created_at,
    url: item.url,
  }));

  return (
    <Box height="100%" sx={{ width: "100%", overflowX: "auto" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: { paginationModel: { pageSize: 100 } },
        }}
        density="compact"
        disableColumnMenu
        sx={{
          ...dataGridSx(theme),
          height: "100%",
          minWidth: 420,
        }}
      />
    </Box>
  );
};

export default EmojisDataGrid;

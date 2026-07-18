import React, { useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Typography, useTheme } from "@mui/material";
import { TableSkeleton } from "./skeletons/DashSkeleton";
import UsageBarCell from "./UsageBarCell";
import { dataGridSx } from "utils/dataGridSx";

const EmojiCell = ({ name, url }) => (
  <Box
    display="flex"
    alignItems="center"
    gap={1.25}
    width="100%"
    minWidth={0}
    height="100%"
  >
    <Box
      component="img"
      src={url}
      alt=""
      width={28}
      height={28}
      sx={{
        objectFit: "contain",
        flexShrink: 0,
        borderRadius: 0.5,
      }}
    />
    <Typography
      variant="body2"
      fontWeight={500}
      noWrap
      title={name}
      sx={{ minWidth: 0 }}
    >
      {name}
    </Typography>
  </Box>
);

const EmojisDataGrid = ({ data, isLoading }) => {
  const theme = useTheme();

  const rows = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.map((item, index) => ({
      id: item.id ?? item.emoji_name ?? index + 1,
      emoji_name: item.emoji_name,
      occurrences: item.occurrences ?? 0,
      created_at: item.created_at,
      url: item.url,
    }));
  }, [data]);

  const maxOccurrences = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.occurrences || 0), 0),
    [rows]
  );

  const columns = useMemo(
    () => [
      {
        field: "emoji_name",
        headerName: "Emoji",
        flex: 1.6,
        minWidth: 160,
        renderCell: (params) => (
          <EmojiCell name={params.value} url={params.row.url} />
        ),
      },
      {
        field: "occurrences",
        headerName: "Usage",
        flex: 1.4,
        minWidth: 140,
        type: "number",
        align: "left",
        headerAlign: "left",
        renderCell: (params) => (
          <UsageBarCell value={params.value} max={maxOccurrences} />
        ),
      },
      {
        field: "created_at",
        headerName: "Added",
        width: 112,
        sortable: true,
        renderCell: (params) => (
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {params.value || "—"}
          </Typography>
        ),
      },
    ],
    [maxOccurrences]
  );

  if (!data || isLoading) {
    return (
      <Box height="100%">
        <TableSkeleton rows={10} columns={3} height="100%" />
      </Box>
    );
  }

  return (
    <Box height="100%" sx={{ width: "100%", overflowX: "auto" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        initialState={{
          pagination: { paginationModel: { pageSize: 100 } },
          sorting: { sortModel: [{ field: "occurrences", sort: "desc" }] },
        }}
        density="compact"
        disableColumnMenu
        disableRowSelectionOnClick
        sx={{
          ...dataGridSx(theme),
          height: "100%",
          minWidth: 360,
          "& .MuiDataGrid-cell": {
            display: "flex",
            alignItems: "center",
            borderBottom: `1px solid ${theme.palette.divider}`,
          },
          "& .MuiDataGrid-columnHeaders": {
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.02)",
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            color: theme.palette.text.secondary,
            fontWeight: 600,
            fontSize: "0.75rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          },
        }}
      />
    </Box>
  );
};

export default EmojisDataGrid;

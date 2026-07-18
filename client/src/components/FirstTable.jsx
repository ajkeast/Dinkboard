import React, { useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Avatar, Box, Typography, useTheme } from "@mui/material";
import QueryState from "./QueryState";
import { TableSkeleton } from "./skeletons/DashSkeleton";
import UsageBarCell from "./UsageBarCell";
import { dataGridSx } from "utils/dataGridSx";

const nameInitials = (name = "") => {
  const cleaned = String(name)
    .replace(/:[^:\s]+:/g, " ")
    .trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const NameCell = ({ name, avatar, rank }) => {
  const theme = useTheme();

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={1.25}
      width="100%"
      minWidth={0}
      height="100%"
    >
      <Avatar
        src={avatar || undefined}
        alt=""
        title={`#${rank}`}
        sx={{
          width: 28,
          height: 28,
          fontSize: "0.65rem",
          fontWeight: 700,
          flexShrink: 0,
          bgcolor:
            theme.palette.mode === "dark"
              ? theme.palette.secondary[700]
              : theme.palette.secondary[100],
          color:
            theme.palette.mode === "dark"
              ? theme.palette.secondary[100]
              : theme.palette.secondary[700],
        }}
      >
        {nameInitials(name)}
      </Avatar>
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
};

const FirstTable = ({ data, isLoading, error, onRetry }) => {
  const theme = useTheme();

  const rows = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return [...data]
      .map((item, index) => ({
        id: item.user_id ?? item.user_name ?? index + 1,
        user_name: item.user_name,
        avatar: item.avatar ?? null,
        firsts: item.firsts ?? 0,
        days_since_first: item.days_since_first ?? 0,
      }))
      .sort((a, b) => b.firsts - a.firsts)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [data]);

  const maxFirsts = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.firsts || 0), 0),
    [rows]
  );

  const columns = useMemo(
    () => [
      {
        field: "user_name",
        headerName: "Member",
        flex: 1.5,
        minWidth: 140,
        renderCell: (params) => (
          <NameCell
            name={params.value}
            avatar={params.row.avatar}
            rank={params.row.rank}
          />
        ),
      },
      {
        field: "firsts",
        headerName: "Firsts",
        flex: 1.3,
        minWidth: 120,
        type: "number",
        align: "left",
        headerAlign: "left",
        renderCell: (params) => (
          <UsageBarCell value={params.value} max={maxFirsts} />
        ),
      },
      {
        field: "days_since_first",
        headerName: "Days",
        width: 72,
        type: "number",
        align: "right",
        headerAlign: "right",
        description: "Days since first",
        renderCell: (params) => (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {Number(params.value ?? 0).toLocaleString()}
          </Typography>
        ),
      },
    ],
    [maxFirsts]
  );

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

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        initialState={{
          pagination: { paginationModel: { pageSize: 5 } },
          sorting: { sortModel: [{ field: "firsts", sort: "desc" }] },
        }}
        autoHeight
        density="compact"
        disableColumnMenu
        disableRowSelectionOnClick
        sx={{
          ...dataGridSx(theme),
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

export default FirstTable;

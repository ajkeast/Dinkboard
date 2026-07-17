/** Shared DataGrid surface styles — sharp corners matching theme.shape. */
export const dataGridSx = (theme) => ({
  fontSize: "0.9rem",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  overflow: "hidden",
  width: "100%",
  "& .MuiDataGrid-main": {
    borderRadius: theme.shape.borderRadius,
  },
  "& .MuiDataGrid-virtualScroller": {
    overflowX: "auto !important",
  },
  "& .MuiDataGrid-columnHeaders": {
    borderTopLeftRadius: theme.shape.borderRadius,
    borderTopRightRadius: theme.shape.borderRadius,
  },
  "& .MuiDataGrid-columnHeader": {
    fontWeight: "bold !important",
    // Without the menu button, use full header width for the label
    "& .MuiDataGrid-columnHeaderTitleContainer": {
      overflow: "visible",
    },
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    textOverflow: "ellipsis",
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  "& .MuiDataGrid-row:hover": {
    boxShadow: theme.customShadows.card,
    transition: "box-shadow 150ms ease",
  },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
    outline: "none",
  },
});

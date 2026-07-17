/** Shared DataGrid surface styles — sharp corners matching theme.shape. */
export const dataGridSx = (theme) => ({
  fontSize: "0.9rem",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  overflow: "hidden",
  "& .MuiDataGrid-main": {
    borderRadius: theme.shape.borderRadius,
  },
  "& .MuiDataGrid-columnHeaders": {
    borderTopLeftRadius: theme.shape.borderRadius,
    borderTopRightRadius: theme.shape.borderRadius,
  },
  "& .MuiDataGrid-columnHeader": { fontWeight: "bold !important" },
  "& .MuiDataGrid-row:hover": {
    boxShadow: theme.customShadows.card,
    transition: "box-shadow 150ms ease",
  },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
    outline: "none",
  },
});

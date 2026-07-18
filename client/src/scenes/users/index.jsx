import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Select,
  Typography,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import Header from "components/Header";
import DashCard from "components/DashCard";
import QueryState from "components/QueryState";
import { dataGridSx } from "utils/dataGridSx";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "state/authSlice";
import {
  useGetUsersQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
  getApiErrorMessage,
} from "state/api";

const UsersAdmin = () => {
  const theme = useTheme();
  const me = useSelector(selectCurrentUser);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionError, setActionError] = useState("");

  const { data, isLoading, error, refetch } = useGetUsersQuery();
  const [updateRole, { isLoading: isUpdating }] = useUpdateUserRoleMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const rows = useMemo(
    () =>
      (data || []).map((u) => ({
        ...u,
        when: u.created_at
          ? new Date(u.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "",
      })),
    [data]
  );

  const handleRoleChange = async (id, role) => {
    setActionError("");
    try {
      await updateRole({ id, role }).unwrap();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Could not update role"));
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionError("");
    try {
      await deleteUser(confirmDelete.id).unwrap();
      setConfirmDelete(null);
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Could not delete user"));
    }
  };

  const columns = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 70 },
      { field: "username", headerName: "Username", flex: 1, minWidth: 120 },
      { field: "email", headerName: "Email", flex: 1.4, minWidth: 180 },
      {
        field: "role",
        headerName: "Role",
        width: 140,
        renderCell: (params) => {
          const isSelf = params.row.id === me?.id;
          return (
            <Select
              size="small"
              value={params.value}
              disabled={isUpdating || isSelf}
              onChange={(e) => handleRoleChange(params.row.id, e.target.value)}
              sx={{ fontSize: "0.85rem", height: 32 }}
            >
              <MenuItem value="viewer">viewer</MenuItem>
              <MenuItem value="admin">admin</MenuItem>
            </Select>
          );
        },
      },
      { field: "when", headerName: "Joined", flex: 0.9, minWidth: 120 },
      {
        field: "actions",
        headerName: "",
        width: 110,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const isSelf = params.row.id === me?.id;
          return (
            <Button
              size="small"
              color="error"
              disabled={isSelf || isDeleting}
              onClick={() => setConfirmDelete(params.row)}
            >
              Delete
            </Button>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me?.id, isUpdating, isDeleting]
  );

  return (
    <Box>
      <Header
        title="Users"
        subtitle="Manage site accounts — admins only"
      />
      {actionError && (
        <Typography color="error" variant="body2" mt={1}>
          {actionError}
        </Typography>
      )}

      <DashCard sx={{ mt: 1.5, minHeight: 420 }}>
        <Box p={1.5}>
          <QueryState
            isLoading={isLoading}
            error={error}
            isEmpty={!rows.length}
            emptyMessage="No users found"
            onRetry={refetch}
            skeletonVariant="table"
            skeletonHeight={320}
          >
            <Box height={420} width="100%">
              <DataGrid
                rows={rows}
                columns={columns}
                density="compact"
                disableRowSelectionOnClick
                pageSizeOptions={[25, 50]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 25 } },
                }}
                sx={dataGridSx(theme)}
                getRowId={(row) => row.id}
              />
            </Box>
          </QueryState>
        </Box>
      </DashCard>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete user?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete{" "}
            <strong>{confirmDelete?.username}</strong> (
            {confirmDelete?.email})? Their sessions will be revoked. Usage
            history keeps orphaned rows with no user.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersAdmin;

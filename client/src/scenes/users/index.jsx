import React, { useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ClearRounded,
  DeleteOutlineRounded,
  SearchRounded,
  ShieldOutlined,
  PersonOutline,
  GroupOutlined,
} from "@mui/icons-material";
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

const UserAvatar = ({ name, isSelf }) => {
  const theme = useTheme();
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <Avatar
      sx={{
        width: 32,
        height: 32,
        fontSize: 13,
        fontWeight: 700,
        bgcolor: isSelf
          ? theme.palette.mode === "dark"
            ? "rgba(142, 123, 218, 0.28)"
            : "rgba(67, 35, 194, 0.12)"
          : theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.06)",
        color: isSelf
          ? theme.palette.secondary.main
          : theme.palette.text.secondary,
      }}
    >
      {initial}
    </Avatar>
  );
};

const SummaryCell = ({ label, value, icon }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: "1 1 0",
        minWidth: 0,
        px: { xs: 1.5, sm: 2 },
        py: 1.5,
      }}
    >
      <Box display="flex" alignItems="center" gap={0.5} mb={0.5} minWidth={0}>
        {icon && (
          <Box
            sx={{
              color: "text.secondary",
              display: "flex",
              flexShrink: 0,
              "& svg": { fontSize: 16 },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          variant="caption"
          fontWeight={600}
          color="text.secondary"
          noWrap
          sx={{ letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        variant="h4"
        fontWeight={700}
        sx={{
          color: theme.palette.text.primary,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

const UsersAdmin = () => {
  const theme = useTheme();
  const me = useSelector(selectCurrentUser);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");

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

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (u) =>
        String(u.username || "")
          .toLowerCase()
          .includes(q) ||
        String(u.email || "")
          .toLowerCase()
          .includes(q)
    );
  }, [rows, search]);

  const counts = useMemo(() => {
    const list = data || [];
    return {
      total: list.length,
      admins: list.filter((u) => u.role === "admin").length,
      viewers: list.filter((u) => u.role === "viewer").length,
    };
  }, [data]);

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
      {
        field: "username",
        headerName: "User",
        flex: 1.2,
        minWidth: 180,
        renderCell: (params) => {
          const isSelf = params.row.id === me?.id;
          return (
            <Box
              display="flex"
              alignItems="center"
              gap={1.25}
              minWidth={0}
              width="100%"
            >
              <UserAvatar name={params.value} isSelf={isSelf} />
              <Box minWidth={0}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  noWrap
                  sx={{ lineHeight: 1.25 }}
                >
                  {params.value}
                  {isSelf && (
                    <Box
                      component="span"
                      sx={{
                        ml: 0.75,
                        color: "text.secondary",
                        fontWeight: 500,
                        fontSize: "0.75rem",
                      }}
                    >
                      you
                    </Box>
                  )}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  display="block"
                  sx={{ lineHeight: 1.3 }}
                >
                  {params.row.email}
                </Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        field: "role",
        headerName: "Role",
        width: 140,
        renderCell: (params) => {
          const isSelf = params.row.id === me?.id;
          const isAdmin = params.value === "admin";
          return (
            <Select
              size="small"
              value={params.value}
              disabled={isUpdating || isSelf}
              onChange={(e) => handleRoleChange(params.row.id, e.target.value)}
              sx={{
                fontSize: "0.8rem",
                fontWeight: 600,
                height: 30,
                minWidth: 108,
                color: isAdmin
                  ? theme.palette.secondary.main
                  : theme.palette.text.secondary,
                bgcolor: isAdmin
                  ? theme.palette.mode === "dark"
                    ? "rgba(142, 123, 218, 0.14)"
                    : "rgba(67, 35, 194, 0.08)"
                  : theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.03)",
                "& .MuiOutlinedInput-notchedOutline": {
                  border: "none",
                },
                "& .MuiSelect-select": {
                  py: 0.5,
                  display: "flex",
                  alignItems: "center",
                },
              }}
            >
              <MenuItem value="viewer">Viewer</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          );
        },
      },
      {
        field: "when",
        headerName: "Joined",
        flex: 0.7,
        minWidth: 110,
      },
      {
        field: "id",
        headerName: "ID",
        width: 72,
        align: "right",
        headerAlign: "right",
      },
      {
        field: "actions",
        headerName: "",
        width: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "center",
        renderCell: (params) => {
          const isSelf = params.row.id === me?.id;
          return (
            <Tooltip title={isSelf ? "You can’t delete yourself" : "Delete user"}>
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={isSelf || isDeleting}
                  onClick={() => setConfirmDelete(params.row)}
                  aria-label={`Delete ${params.row.username}`}
                >
                  <DeleteOutlineRounded fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me?.id, isUpdating, isDeleting, theme]
  );

  return (
    <Box>
      <Box
        display="flex"
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        gap={1.5}
        flexWrap="wrap"
      >
        <Header
          title="Users"
          subtitle="Accounts with access to this dashboard"
        />
        <TextField
          size="small"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            minWidth: { xs: "100%", sm: 240 },
            "& .MuiOutlinedInput-root": {
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(0,0,0,0.02)",
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded
                  sx={{ fontSize: 18, color: "text.secondary" }}
                />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  edge="end"
                >
                  <ClearRounded sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Box>

      {actionError && (
        <Alert
          severity="error"
          onClose={() => setActionError("")}
          sx={{ mt: 1.5 }}
        >
          {actionError}
        </Alert>
      )}

      <Box mt={2} display="flex" flexDirection="column" gap={1.5}>
        <DashCard>
          <QueryState
            isLoading={isLoading}
            error={error}
            onRetry={refetch}
            skeletonHeight={72}
          >
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
              <SummaryCell
                label="Total"
                value={counts.total}
                icon={<GroupOutlined />}
              />
              <SummaryCell
                label="Admins"
                value={counts.admins}
                icon={<ShieldOutlined />}
              />
              <SummaryCell
                label="Viewers"
                value={counts.viewers}
                icon={<PersonOutline />}
              />
            </Box>
          </QueryState>
        </DashCard>

        <DashCard sx={{ minHeight: 440 }}>
          <Box px={1.5} pt={1.5} pb={1}>
            <Typography variant="h6" fontWeight={600}>
              Directory
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {search.trim()
                ? `${filteredRows.length} match${filteredRows.length === 1 ? "" : "es"}`
                : "Change roles or remove accounts"}
            </Typography>
          </Box>
          <Box px={1.5} pb={1.5}>
            <QueryState
              isLoading={isLoading}
              error={error}
              isEmpty={!filteredRows.length}
              emptyMessage={
                search.trim() ? "No users match your search" : "No users found"
              }
              onRetry={refetch}
              skeletonVariant="table"
              skeletonHeight={320}
            >
              <Box height={420} width="100%">
                <DataGrid
                  rows={filteredRows}
                  columns={columns}
                  density="standard"
                  disableRowSelectionOnClick
                  pageSizeOptions={[25, 50]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 25 } },
                  }}
                  getRowId={(row) => row.id}
                  getRowHeight={() => 56}
                  sx={{
                    ...dataGridSx(theme),
                    border: "none",
                    "& .MuiDataGrid-columnHeaders": {
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(0,0,0,0.02)",
                    },
                    "& .MuiDataGrid-cell": {
                      display: "flex",
                      alignItems: "center",
                      borderColor:
                        theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.06)",
                    },
                    "& .MuiDataGrid-row:hover": {
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(0,0,0,0.015)",
                    },
                  }}
                />
              </Box>
            </QueryState>
          </Box>
        </DashCard>
      </Box>

      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: `${theme.shape.borderRadius}px`,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>Delete user?</DialogTitle>
        <DialogContent>
          <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
            <UserAvatar name={confirmDelete?.username} />
            <Box minWidth={0}>
              <Typography variant="body1" fontWeight={600} noWrap>
                {confirmDelete?.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {confirmDelete?.email}
              </Typography>
            </Box>
          </Box>
          <DialogContentText sx={{ fontSize: "0.875rem" }}>
            Their sessions will be revoked. Usage history keeps orphaned rows
            with no user.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={isDeleting}
            disableElevation
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersAdmin;

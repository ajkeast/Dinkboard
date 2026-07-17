import React from "react";
import {
  LightModeOutlined,
  DarkModeOutlined,
  Menu as MenuIcon,
  LogoutOutlined,
} from "@mui/icons-material";
import FlexBetween from "./FlexBetween";
import { useDispatch } from "react-redux";
import { setMode } from "state";
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useLogoutMutation } from "state/api";

const Navbar = ({ user, isSidebarOpen, setIsSidebarOpen }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const navigate = useNavigate();
  const [logout, { isLoading }] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // session cleared in onQueryStarted
    }
    navigate("/login", { replace: true });
  };

  return (
    <AppBar
      sx={{
        position: "static",
        background: "none",
        boxShadow: "none",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", minHeight: 52, px: 1.5 }}>
        <FlexBetween>
          <IconButton onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <MenuIcon fontSize="small" />
          </IconButton>
        </FlexBetween>

        <FlexBetween gap={0.25}>
          <Tooltip title="Toggle theme">
            <IconButton onClick={() => dispatch(setMode())}>
              {theme.palette.mode === "dark" ? (
                <DarkModeOutlined fontSize="small" />
              ) : (
                <LightModeOutlined fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          {user && (
            <Box
              display={{ xs: "none", sm: "flex" }}
              alignItems="center"
              gap={1}
              mx={0.5}
              sx={{ maxWidth: 220 }}
            >
              <Avatar
                src={user.avatar_url || undefined}
                alt={user.username}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: theme.palette.secondary.main,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {(user.username || "?").charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {user.username}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  display="block"
                >
                  {user.email}
                </Typography>
              </Box>
            </Box>
          )}
          <Tooltip title="Log out">
            <IconButton onClick={handleLogout} disabled={isLoading}>
              <LogoutOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </FlexBetween>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

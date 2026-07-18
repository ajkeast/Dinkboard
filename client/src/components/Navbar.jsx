import React from "react";
import {
  LightModeOutlined,
  DarkModeOutlined,
  Menu as MenuIcon,
  MenuOpenOutlined,
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
  alpha,
  useTheme,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useLogoutMutation } from "state/api";

const Navbar = ({ user, isSidebarOpen, setIsSidebarOpen, isNonMobile }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const navigate = useNavigate();
  const [logout, { isLoading }] = useLogoutMutation();

  const isDark = theme.palette.mode === "dark";
  const accent = theme.palette.secondary.main;
  const hoverBg = isDark ? alpha("#fff", 0.06) : alpha("#000", 0.04);

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // session cleared in onQueryStarted
    }
    navigate("/login", { replace: true });
  };

  const toggleLabel = isNonMobile
    ? isSidebarOpen
      ? "Collapse sidebar"
      : "Expand sidebar"
    : isSidebarOpen
      ? "Close menu"
      : "Open menu";

  return (
    <AppBar
      sx={{
        position: "static",
        background: "none",
        boxShadow: "none",
        borderBottom: `1px solid ${
          isDark ? alpha("#fff", 0.06) : alpha("#000", 0.06)
        }`,
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", minHeight: 52, px: 1.5 }}>
        <FlexBetween>
          <Tooltip title={toggleLabel}>
            <IconButton
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              sx={{
                borderRadius: 1.5,
                color: theme.palette.text.secondary,
                "&:hover": {
                  color: accent,
                  bgcolor: hoverBg,
                },
              }}
            >
              {isNonMobile && isSidebarOpen ? (
                <MenuOpenOutlined fontSize="small" />
              ) : (
                <MenuIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </FlexBetween>

        <FlexBetween gap={0.25}>
          <Tooltip title="Toggle theme">
            <IconButton
              onClick={() => dispatch(setMode())}
              sx={{
                borderRadius: 1.5,
                color: theme.palette.text.secondary,
                "&:hover": {
                  color: accent,
                  bgcolor: hoverBg,
                },
              }}
            >
              {theme.palette.mode === "dark" ? (
                <DarkModeOutlined fontSize="small" />
              ) : (
                <LightModeOutlined fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          {user && (
            <Tooltip
              title={user.member_id ? "View your member profile" : ""}
              disableHoverListener={!user.member_id}
            >
              <Box
                display={{ xs: "none", sm: "flex" }}
                alignItems="center"
                gap={1}
                mx={0.5}
                {...(user.member_id
                  ? {
                      component: RouterLink,
                      to: `/members/${user.member_id}`,
                    }
                  : {})}
                sx={{
                  maxWidth: 220,
                  textDecoration: "none",
                  color: "inherit",
                  borderRadius: 2,
                  px: 0.75,
                  py: 0.5,
                  ...(user.member_id && {
                    cursor: "pointer",
                    transition: theme.transitions.create("background-color", {
                      duration: theme.transitions.duration.shorter,
                    }),
                    "&:hover": {
                      bgcolor: hoverBg,
                      "& .profile-name": {
                        color: accent,
                      },
                    },
                  }),
                }}
              >
                <Avatar
                  src={user.avatar_url || undefined}
                  alt={user.username}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: accent,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {(user.username || "?").charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    className="profile-name"
                    variant="body2"
                    fontWeight={600}
                    noWrap
                  >
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
            </Tooltip>
          )}
          <Tooltip title="Log out">
            <IconButton
              onClick={handleLogout}
              disabled={isLoading}
              sx={{
                borderRadius: 1.5,
                color: theme.palette.text.secondary,
                "&:hover": {
                  color: accent,
                  bgcolor: hoverBg,
                },
              }}
            >
              <LogoutOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </FlexBetween>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

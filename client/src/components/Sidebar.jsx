import React from "react";
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRightOutlined,
  HomeOutlined,
  Groups2Rounded,
  EmojiEmotions,
  MessageRounded,
  LeaderboardRounded,
  SmartToyOutlined,
  BlenderRounded,
  MonetizationOnOutlined,
  LogoutOutlined,
  InsightsOutlined,
} from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import FlexBetween from "./FlexBetween";
import { useLogoutMutation } from "state/api";
import { trackAuth, flush } from "utils/analytics";

const baseNavItems = [
  { text: "Dashboard", icon: <HomeOutlined fontSize="small" />, path: "dashboard" },
  { text: "Chat", icon: null },
  { text: "Messages", icon: <MessageRounded fontSize="small" />, path: "messages" },
  { text: "Members", icon: <Groups2Rounded fontSize="small" />, path: "members" },
  { text: "Emojis", icon: <EmojiEmotions fontSize="small" />, path: "emojis" },
  { text: "AI Usage", icon: <SmartToyOutlined fontSize="small" />, path: "ai" },
  { text: "Economy", icon: null },
  { text: "DinkCoin", icon: <MonetizationOnOutlined fontSize="small" />, path: "economy" },
  { text: "Leaderboards", icon: null },
  { text: "Firsts", icon: <LeaderboardRounded fontSize="small" />, path: "firsts" },
  { text: "Juice", icon: <BlenderRounded fontSize="small" />, path: "juice" },
];

const Sidebar = ({
  user,
  drawerWidth,
  isSidebarOpen,
  setIsSidebarOpen,
  isNonMobile,
}) => {
  const { pathname } = useLocation();
  const [active, setActive] = useState("");
  const navigate = useNavigate();
  const theme = useTheme();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const navItems = useMemo(() => {
    if (user?.role !== "admin") return baseNavItems;
    return [
      ...baseNavItems,
      { text: "Admin", icon: null },
      {
        text: "Analytics",
        icon: <InsightsOutlined fontSize="small" />,
        path: "analytics",
      },
    ];
  }, [user?.role]);

  useEffect(() => {
    setActive(pathname.substring(1));
  }, [pathname]);

  const handleLogout = async () => {
    trackAuth("logout");
    try {
      await flush();
    } catch {
      // ignore analytics flush failures
    }
    try {
      await logout().unwrap();
    } catch {
      // onQueryStarted still clears session
    }
    navigate("/login", { replace: true });
  };

  const drawerContent = (
    <Box width="100%" height="100%" display="flex" flexDirection="column">
      <Box
        width="100%"
        sx={{
          opacity: isSidebarOpen || !isNonMobile ? 1 : 0,
          transition: theme.transitions.create("opacity", {
            easing: theme.transitions.easing.easeInOut,
            duration: theme.transitions.duration.shorter,
          }),
        }}
      >
        <Box m="1rem 0.5rem 1.25rem 0.75rem">
          <FlexBetween color={theme.palette.secondary.main}>
            <Box display="flex" alignItems="center" gap={0.75} minWidth={0}>
              <Box
                component="img"
                alt="Peter Dinkboard"
                src="image.webp"
                height="3rem"
                width="3rem"
                flexShrink={0}
              />
              <Typography variant="subtitle1" fontWeight="bold" noWrap>
                PETER DINKBOARD
              </Typography>
            </Box>
            {!isNonMobile && (
              <IconButton onClick={() => setIsSidebarOpen(false)}>
                <ChevronLeft fontSize="small" />
              </IconButton>
            )}
          </FlexBetween>
        </Box>
        <List disablePadding>
          {navItems.map(({ text, icon, path }) => {
            if (!icon) {
              return (
                <Typography
                  key={text}
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    m: "1rem 0 0.5rem 1.5rem",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {text}
                </Typography>
              );
            }

            const isActive = active === path;

            return (
              <ListItem key={text} disablePadding>
                <ListItemButton
                  onClick={() => {
                    navigate(`/${path}`);
                    setActive(path);
                    if (!isNonMobile) setIsSidebarOpen(false);
                  }}
                  sx={{
                    py: 0.5,
                    minHeight: 36,
                    backgroundColor: isActive
                      ? theme.palette.secondary[300]
                      : "transparent",
                    color: isActive
                      ? theme.palette.mode === "dark"
                        ? theme.palette.primary[800]
                        : theme.palette.grey[900]
                      : theme.palette.mode === "dark"
                        ? theme.palette.secondary[100]
                        : theme.palette.grey[800],
                    "&:hover": {
                      backgroundColor: isActive
                        ? theme.palette.secondary[300]
                        : theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.04)",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      ml: 1.25,
                      color: isActive
                        ? theme.palette.mode === "dark"
                          ? theme.palette.primary[800]
                          : theme.palette.grey[900]
                        : theme.palette.mode === "dark"
                          ? theme.palette.secondary[100]
                          : theme.palette.grey[700],
                    }}
                  >
                    {icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={text}
                    primaryTypographyProps={{ variant: "body2", fontWeight: isActive ? 600 : 400 }}
                  />
                  {isActive && (
                    <ChevronRightOutlined sx={{ ml: "auto", fontSize: 18 }} />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box mt="auto" p="0.75rem 1rem 1rem">
        <Divider sx={{ mb: 1 }} />
        {user && (
          <Tooltip
            title={user.member_id ? "View your member profile" : ""}
            disableHoverListener={!user.member_id}
          >
            <Box
              mb={1}
              display="flex"
              alignItems="center"
              gap={1}
              minWidth={0}
              {...(user.member_id
                ? {
                    component: RouterLink,
                    to: `/members/${user.member_id}`,
                  }
                : {})}
              sx={{
                textDecoration: "none",
                color: "inherit",
                borderRadius: 1,
                px: 0.5,
                py: 0.5,
                mx: -0.5,
                ...(user.member_id && {
                  cursor: "pointer",
                  transition: "background-color 150ms ease",
                  "&:hover": {
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                    "& .profile-name": {
                      color: theme.palette.secondary.main,
                    },
                  },
                }),
              }}
            >
              <Avatar
                src={user.avatar_url || undefined}
                alt={user.username}
                sx={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  bgcolor: theme.palette.secondary.main,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {(user.username || "?").charAt(0).toUpperCase()}
              </Avatar>
              <Box minWidth={0}>
                <Typography
                  className="profile-name"
                  variant="subtitle2"
                  fontWeight={600}
                  noWrap
                  title={user.username}
                >
                  {user.username}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  display="block"
                  title={user.email}
                >
                  {user.email}
                </Typography>
              </Box>
            </Box>
          </Tooltip>
        )}
        <Button
          fullWidth
          size="small"
          variant="outlined"
          startIcon={<LogoutOutlined fontSize="small" />}
          onClick={handleLogout}
          disabled={isLoggingOut}
          sx={{
            justifyContent: "flex-start",
            borderColor:
              theme.palette.mode === "dark"
                ? theme.palette.secondary[400]
                : theme.palette.grey[400],
            color:
              theme.palette.mode === "dark"
                ? theme.palette.secondary[100]
                : theme.palette.grey[800],
          }}
        >
          {isLoggingOut ? "Signing out…" : "Log out"}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box component="nav">
      <Drawer
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        variant={isNonMobile ? "persistent" : "temporary"}
        anchor="left"
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isNonMobile ? (isSidebarOpen ? drawerWidth : 0) : drawerWidth,
          flexShrink: 0,
          whiteSpace: "nowrap",
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter,
          }),
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            color:
              theme.palette.mode === "dark"
                ? theme.palette.secondary[200]
                : theme.palette.grey[800],
            backgroundColor: theme.palette.background.alt,
            borderWidth: isNonMobile ? 0 : "1px",
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.shorter,
            }),
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;

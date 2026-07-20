import React, { useEffect, useMemo, useState } from "react";
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
  alpha,
  useTheme,
} from "@mui/material";
import {
  ChevronLeft,
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
  ManageAccountsOutlined,
  MenuOpenOutlined,
  GraphicEqRounded,
} from "@mui/icons-material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useLogoutMutation } from "state/api";
import { trackAuth, flush } from "utils/analytics";

export const DRAWER_WIDTH_EXPANDED = 256;
export const DRAWER_WIDTH_COLLAPSED = 72;

const baseNavItems = [
  { text: "Dashboard", icon: <HomeOutlined fontSize="small" />, path: "dashboard" },
  { text: "Chat", icon: null },
  { text: "Messages", icon: <MessageRounded fontSize="small" />, path: "messages" },
  { text: "Members", icon: <Groups2Rounded fontSize="small" />, path: "members" },
  { text: "Emojis", icon: <EmojiEmotions fontSize="small" />, path: "emojis" },
  { text: "Vibes", icon: <GraphicEqRounded fontSize="small" />, path: "vibes" },
  { text: "AI Usage", icon: <SmartToyOutlined fontSize="small" />, path: "ai" },
  { text: "Economy", icon: null },
  { text: "DinkCoin", icon: <MonetizationOnOutlined fontSize="small" />, path: "economy" },
  { text: "Leaderboards", icon: null },
  { text: "Firsts", icon: <LeaderboardRounded fontSize="small" />, path: "firsts" },
  { text: "Juice", icon: <BlenderRounded fontSize="small" />, path: "juice" },
];

const isPathActive = (active, path) =>
  active === path || active.startsWith(`${path}/`);

const Sidebar = ({
  user,
  isSidebarOpen,
  setIsSidebarOpen,
  isNonMobile,
}) => {
  const { pathname } = useLocation();
  const [active, setActive] = useState("");
  const navigate = useNavigate();
  const theme = useTheme();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const isExpanded = isNonMobile ? isSidebarOpen : true;
  const drawerWidth = isNonMobile
    ? isSidebarOpen
      ? DRAWER_WIDTH_EXPANDED
      : DRAWER_WIDTH_COLLAPSED
    : DRAWER_WIDTH_EXPANDED;

  const isDark = theme.palette.mode === "dark";
  const accent = theme.palette.secondary.main;
  const hoverBg = isDark
    ? alpha("#fff", 0.06)
    : alpha("#000", 0.04);
  const activeBg = alpha(accent, isDark ? 0.18 : 0.12);
  const borderColor = isDark
    ? alpha("#fff", 0.08)
    : alpha("#000", 0.08);
  const mutedText = theme.palette.text.secondary;
  const defaultText = isDark
    ? theme.palette.secondary[100]
    : theme.palette.grey[800];

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
      {
        text: "Users",
        icon: <ManageAccountsOutlined fontSize="small" />,
        path: "users",
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

  const handleNavClick = (path) => {
    navigate(`/${path}`);
    setActive(path);
    if (!isNonMobile) setIsSidebarOpen(false);
  };

  const drawerContent = (
    <Box
      height="100%"
      display="flex"
      flexDirection="column"
      sx={{ overflow: "hidden" }}
    >
      {/* Brand header */}
      <Box
        sx={{
          flexShrink: 0,
          px: isExpanded ? 1.75 : 1,
          pt: 1.75,
          pb: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: isExpanded ? "space-between" : "center",
          gap: 1,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          minWidth={0}
          sx={{
            cursor: "default",
            justifyContent: isExpanded ? "flex-start" : "center",
            width: isExpanded ? "auto" : "100%",
          }}
        >
          <Box
            component="img"
            alt="Peter Dinkboard"
            src="image.webp"
            sx={{
              height: 36,
              width: 36,
              flexShrink: 0,
              borderRadius: 1.5,
              objectFit: "cover",
            }}
          />
          {isExpanded && (
            <Typography
              variant="subtitle2"
              fontWeight={700}
              noWrap
              sx={{
                color: accent,
                letterSpacing: "0.02em",
                lineHeight: 1.2,
              }}
            >
              PETER DINKBOARD
            </Typography>
          )}
        </Box>

        {isExpanded && (
          <Tooltip title={isNonMobile ? "Collapse sidebar" : "Close menu"}>
            <IconButton
              onClick={() => setIsSidebarOpen(false)}
              size="small"
              sx={{
                color: mutedText,
                border: `1px solid ${borderColor}`,
                borderRadius: 1.5,
                width: 30,
                height: 30,
                "&:hover": {
                  color: accent,
                  borderColor: alpha(accent, 0.4),
                  bgcolor: activeBg,
                },
              }}
            >
              {isNonMobile ? (
                <MenuOpenOutlined sx={{ fontSize: 18 }} />
              ) : (
                <ChevronLeft sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Nav list */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          px: isExpanded ? 1.25 : 0.75,
          py: 1.25,
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: alpha(mutedText, 0.35),
            borderRadius: 4,
          },
        }}
      >
        <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          {navItems.map(({ text, icon, path }) => {
            if (!icon) {
              if (!isExpanded) {
                return (
                  <Divider
                    key={text}
                    sx={{
                      my: 1,
                      mx: 0.5,
                      borderColor,
                    }}
                  />
                );
              }
              return (
                <Typography
                  key={text}
                  variant="caption"
                  sx={{
                    display: "block",
                    px: 1.25,
                    pt: 1.5,
                    pb: 0.5,
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: mutedText,
                  }}
                >
                  {text}
                </Typography>
              );
            }

            const isActive = isPathActive(active, path);
            const button = (
              <ListItemButton
                onClick={() => handleNavClick(path)}
                selected={isActive}
                sx={{
                  position: "relative",
                  minHeight: 40,
                  px: isExpanded ? 1.25 : 1,
                  py: 0.75,
                  borderRadius: 2,
                  justifyContent: isExpanded ? "flex-start" : "center",
                  color: isActive ? accent : defaultText,
                  backgroundColor: isActive ? activeBg : "transparent",
                  transition: theme.transitions.create(
                    ["background-color", "color", "padding"],
                    { duration: theme.transitions.duration.shorter }
                  ),
                  ...(isExpanded && {
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: isActive ? 20 : 0,
                      borderRadius: "0 3px 3px 0",
                      backgroundColor: accent,
                      transition: theme.transitions.create("height", {
                        duration: theme.transitions.duration.shorter,
                      }),
                    },
                  }),
                  "&.Mui-selected": {
                    backgroundColor: activeBg,
                    "&:hover": {
                      backgroundColor: alpha(accent, isDark ? 0.24 : 0.16),
                    },
                  },
                  "&:hover": {
                    backgroundColor: isActive
                      ? alpha(accent, isDark ? 0.24 : 0.16)
                      : hoverBg,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: isExpanded ? 36 : 0,
                    mr: isExpanded ? 0.5 : 0,
                    justifyContent: "center",
                    color: "inherit",
                    "& .MuiSvgIcon-root": {
                      fontSize: 20,
                    },
                  }}
                >
                  {icon}
                </ListItemIcon>
                {isExpanded && (
                  <ListItemText
                    primary={text}
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: isActive ? 600 : 500,
                      noWrap: true,
                    }}
                  />
                )}
              </ListItemButton>
            );

            return (
              <ListItem key={text} disablePadding sx={{ display: "block" }}>
                {isExpanded ? (
                  button
                ) : (
                  <Tooltip title={text} placement="right" arrow>
                    {button}
                  </Tooltip>
                )}
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          flexShrink: 0,
          px: isExpanded ? 1.25 : 0.75,
          py: 1.25,
          borderTop: `1px solid ${borderColor}`,
          backgroundColor: isDark
            ? alpha("#000", 0.2)
            : alpha("#000", 0.015),
        }}
      >
        {user && (
          <Tooltip
            title={
              user.member_id
                ? "View your member profile"
                : user.username || ""
            }
            placement={isExpanded ? "top" : "right"}
            arrow
          >
            <Box
              mb={isExpanded ? 1 : 0.75}
              display="flex"
              alignItems="center"
              gap={1}
              minWidth={0}
              justifyContent={isExpanded ? "flex-start" : "center"}
              {...(user.member_id
                ? {
                    component: RouterLink,
                    to: `/members/${user.member_id}`,
                    onClick: () => {
                      if (!isNonMobile) setIsSidebarOpen(false);
                    },
                  }
                : {})}
              sx={{
                textDecoration: "none",
                color: "inherit",
                borderRadius: 2,
                px: isExpanded ? 0.75 : 0.5,
                py: 0.75,
                ...(user.member_id && {
                  cursor: "pointer",
                  transition: theme.transitions.create(
                    ["background-color", "color"],
                    { duration: theme.transitions.duration.shorter }
                  ),
                  "&:hover": {
                    bgcolor: hoverBg,
                    "& .profile-name": { color: accent },
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
                  bgcolor: accent,
                  fontSize: 15,
                  fontWeight: 700,
                  outline: isExpanded
                    ? "none"
                    : `2px solid ${alpha(accent, 0.35)}`,
                  outlineOffset: 1,
                }}
              >
                {(user.username || "?").charAt(0).toUpperCase()}
              </Avatar>
              {isExpanded && (
                <Box minWidth={0} flex={1}>
                  <Typography
                    className="profile-name"
                    variant="subtitle2"
                    fontWeight={600}
                    noWrap
                    title={user.username}
                    sx={{ lineHeight: 1.25 }}
                  >
                    {user.username}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    display="block"
                    title={user.email}
                    sx={{ lineHeight: 1.25 }}
                  >
                    {user.email}
                  </Typography>
                </Box>
              )}
            </Box>
          </Tooltip>
        )}

        {isExpanded ? (
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<LogoutOutlined fontSize="small" />}
            onClick={handleLogout}
            disabled={isLoggingOut}
            sx={{
              justifyContent: "flex-start",
              borderRadius: 2,
              borderColor,
              color: defaultText,
              py: 0.75,
              "&:hover": {
                borderColor: alpha(accent, 0.5),
                bgcolor: hoverBg,
                color: accent,
              },
            }}
          >
            {isLoggingOut ? "Signing out…" : "Log out"}
          </Button>
        ) : (
          <Tooltip title="Log out" placement="right" arrow>
            <span>
              <IconButton
                onClick={handleLogout}
                disabled={isLoggingOut}
                sx={{
                  width: "100%",
                  borderRadius: 2,
                  border: `1px solid ${borderColor}`,
                  color: defaultText,
                  "&:hover": {
                    borderColor: alpha(accent, 0.5),
                    bgcolor: hoverBg,
                    color: accent,
                  },
                }}
              >
                <LogoutOutlined fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ flexShrink: 0 }}>
      <Drawer
        open={isNonMobile ? true : isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        variant={isNonMobile ? "permanent" : "temporary"}
        anchor="left"
        ModalProps={{ keepMounted: true }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          whiteSpace: "nowrap",
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.short,
          }),
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            overflowX: "hidden",
            color: defaultText,
            backgroundColor: theme.palette.background.alt,
            borderRight: `1px solid ${borderColor}`,
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.short,
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

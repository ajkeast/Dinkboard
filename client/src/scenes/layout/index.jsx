import React, { useState } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Navbar from "components/Navbar";
import Sidebar from "components/Sidebar";
import { selectCurrentUser } from "state/authSlice";

const Layout = () => {
  const isNonMobile = useMediaQuery("(min-width: 600px)");
  const [isSidebarOpen, setIsSidebarOpen] = useState(isNonMobile);
  const theme = useTheme();
  const user = useSelector(selectCurrentUser);

  return (
    <Box display={isNonMobile ? "flex" : "block"} width="100%" height="100%">
      <Sidebar
        user={user}
        isNonMobile={isNonMobile}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <Box
        flexGrow={1}
        sx={{
          width: "100%",
          minWidth: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.short,
          }),
        }}
      >
        <Navbar
          user={user}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isNonMobile={isNonMobile}
        />
        <Box
          component="main"
          sx={{
            flex: 1,
            minHeight: 0,
            px: { xs: 1, sm: 1.5, md: 2 },
            pb: 2,
            minWidth: 0,
            maxWidth: "100%",
            overflowY: "auto",
            // clip avoids the overflow-x:hidden → overflow-y:auto quirk that
            // can crop chart legends on real iOS browsers.
            overflowX: "clip",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;

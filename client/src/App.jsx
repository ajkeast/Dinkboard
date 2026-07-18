import { CssBaseline, ThemeProvider } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { themeSettings } from "theme";
import { AuthBootstrap, PublicOnly, RequireAuth, RequireAdmin } from "components/AuthGate";
import AnalyticsTracker from "components/AnalyticsTracker";
import Layout from "scenes/layout";
import Dashboard from "scenes/dashboard";
import Members from "scenes/members";
import MemberProfile from "scenes/members/profile";
import Messages from "scenes/messages";
import Emojis from "scenes/emojis";
import Firsts from "scenes/firsts";
import Juice from "scenes/juice";
import AI from "scenes/ai";
import Economy from "scenes/economy";
import Analytics from "scenes/analytics";
import UsersAdmin from "scenes/users";
import Login from "scenes/login";
import Register from "scenes/register";

function App() {
  const mode = useSelector((state) => state.global.mode);
  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);

  return (
    <div className="app">
      <HashRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthBootstrap>
            <AnalyticsTracker />
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicOnly>
                    <Login />
                  </PublicOnly>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicOnly>
                    <Register />
                  </PublicOnly>
                }
              />
              <Route
                element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/emojis" element={<Emojis />} />
                <Route path="/members" element={<Members />} />
                <Route path="/members/:id" element={<MemberProfile />} />
                <Route path="/firsts" element={<Firsts />} />
                <Route path="/juice" element={<Juice />} />
                <Route path="/ai" element={<AI />} />
                <Route path="/economy" element={<Economy />} />
                <Route
                  path="/analytics"
                  element={
                    <RequireAdmin>
                      <Analytics />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <RequireAdmin>
                      <UsersAdmin />
                    </RequireAdmin>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthBootstrap>
        </ThemeProvider>
      </HashRouter>
    </div>
  );
}

export default App;

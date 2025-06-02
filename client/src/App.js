// Resume @ https://youtu.be/0cPCMIuDk2I?t=4288

import { CssBaseline, ThemeProvider } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { themeSettings } from "theme";
import Layout from "scenes/layout";
import Dashboard from "scenes/dashboard";
import Members from "scenes/members"
import Messages from "scenes/messages"
import Emojis from "scenes/emojis";
import Firsts from "scenes/firsts";
import Juice from "scenes/juice";
import AI from "scenes/ai";

function App() {
  const mode = useSelector((state) => state.global.mode);
  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);
  return (
    <div className="app">
        <HashRouter>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/emojis" element={<Emojis />} />
                <Route path="/members" element={<Members />} />
                <Route path="/firsts" element={<Firsts />} />
                <Route path="/juice" element={<Juice />} />
                <Route path="/ai" element={<AI />} />
              </Route>
            </Routes>
          </ThemeProvider>
        </HashRouter>
    </div>
  );
}

export default App;

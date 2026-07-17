import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Link,
  Paper,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useLoginMutation, getApiErrorMessage } from "state/api";
import { setCredentials } from "state/authSlice";
import DiscordAuthButton from "components/DiscordAuthButton";

const Login = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const params = new URLSearchParams(location.search);
  const discordFailed = params.get("error") === "discord_auth_failed";
  const [error, setError] = useState(
    discordFailed
      ? "Discord sign-in failed. Please try again or use email and password."
      : ""
  );
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Enter a valid email";
    }
    if (!password) next.password = "Password is required";
    else if (password.length < 10) {
      next.password = "Password must be at least 10 characters";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    try {
      const result = await login({ email: email.trim(), password }).unwrap();
      dispatch(setCredentials(result.user));
      const dest = location.state?.from?.pathname || "/dashboard";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed"));
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={2}
      sx={{
        background: (t) =>
          t.palette.mode === "dark"
            ? `linear-gradient(160deg, ${t.palette.primary[700]} 0%, ${t.palette.background.default} 50%, ${t.palette.secondary[900]} 100%)`
            : `linear-gradient(160deg, ${t.palette.grey[50]} 0%, ${t.palette.background.default} 45%, ${t.palette.secondary[100]} 100%)`,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: { xs: 2.5, sm: 3 },
          borderRadius: `${theme.shape.borderRadius}px`,
          backgroundColor: theme.palette.background.alt,
          boxShadow: theme.customShadows.cardHover,
        }}
      >
        <Box display="flex" flexDirection="column" alignItems="center" mb={2.5}>
          <Box
            component="img"
            alt="Peter Dinkboard"
            src="image.webp"
            height={56}
            width={56}
            sx={{ mb: 1 }}
          />
          <Typography variant="h4" fontWeight="bold" textAlign="center">
            PETER DINKBOARD
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            textAlign="center"
            mt={0.5}
          >
            Sign in to your dashboard
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email}
            disabled={isLoading}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password}
            disabled={isLoading}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{
              mt: 2,
              mb: 0,
              py: 1,
              fontWeight: 600,
              backgroundColor: theme.palette.secondary.main,
              color: "#fff",
              "&:hover": {
                backgroundColor: theme.palette.secondary[400],
              },
            }}
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </Button>
        </Box>

        <DiscordAuthButton disabled={isLoading} />

        <Typography variant="body2" textAlign="center" color="text.secondary">
          No account?{" "}
          <Link
            component={RouterLink}
            to="/register"
            underline="hover"
            sx={{
              color: theme.palette.secondary.main,
              fontWeight: 600,
              "&:hover": {
                color:
                  theme.palette.mode === "dark"
                    ? theme.palette.secondary[200]
                    : theme.palette.secondary[400],
              },
            }}
          >
            Register
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;

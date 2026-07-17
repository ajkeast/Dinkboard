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
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useRegisterMutation, getApiErrorMessage } from "state/api";
import { setCredentials } from "state/authSlice";
import DiscordAuthButton from "components/DiscordAuthButton";

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,50}$/;

const Register = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [register, { isLoading }] = useRegisterMutation();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Enter a valid email";
    }
    if (!username.trim()) next.username = "Username is required";
    else if (!USERNAME_RE.test(username)) {
      next.username =
        "3–50 characters: letters, numbers, underscores, dots, hyphens";
    }
    if (!password) next.password = "Password is required";
    else if (password.length < 10) {
      next.password = "Password must be at least 10 characters";
    }
    if (confirm !== password) next.confirm = "Passwords do not match";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    try {
      const result = await register({
        email: email.trim(),
        username: username.trim(),
        password,
      }).unwrap();
      dispatch(setCredentials(result.user));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const details = err?.data?.error?.details;
      if (Array.isArray(details) && details.length) {
        const mapped = {};
        details.forEach(({ path, message }) => {
          const key = Array.isArray(path) ? path[0] : path;
          if (key) mapped[key] = message;
        });
        if (Object.keys(mapped).length) setFieldErrors(mapped);
      }
      setError(getApiErrorMessage(err, "Registration failed"));
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
            Create account
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            mt={0.5}
          >
            Join PETER DINKBOARD
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
            label="Username"
            fullWidth
            margin="normal"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={Boolean(fieldErrors.username)}
            helperText={fieldErrors.username}
            disabled={isLoading}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password || "At least 10 characters"}
            disabled={isLoading}
          />
          <TextField
            label="Confirm password"
            type="password"
            fullWidth
            margin="normal"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={Boolean(fieldErrors.confirm)}
            helperText={fieldErrors.confirm}
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
            {isLoading ? "Creating account…" : "Register"}
          </Button>
        </Box>

        <DiscordAuthButton disabled={isLoading} />

        <Typography variant="body2" textAlign="center" color="text.secondary">
          Already have an account?{" "}
          <Link
            component={RouterLink}
            to="/login"
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
            Sign in
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Register;

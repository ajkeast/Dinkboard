import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, CircularProgress } from "@mui/material";
import { Navigate, useLocation } from "react-router-dom";
import {
  selectAuthStatus,
  selectIsAuthenticated,
  setAuthLoading,
  setCredentials,
  loggedOut,
} from "state/authSlice";
import { useLazyMeQuery, useRefreshMutation } from "state/api";

/**
 * On mount: try GET /api/auth/me; on 401 try refresh once, then me again.
 * Cookie session is the source of truth — no tokens in JS.
 */
export function AuthBootstrap({ children }) {
  const dispatch = useDispatch();
  const status = useSelector(selectAuthStatus);
  const [triggerMe] = useLazyMeQuery();
  const [refresh] = useRefreshMutation();

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      dispatch(setAuthLoading());
      try {
        const meResult = await triggerMe(undefined, true);
        if (cancelled) return;

        if (meResult.data?.user) {
          dispatch(setCredentials(meResult.data.user));
          return;
        }

        // Access cookie missing/expired — try refresh
        try {
          const refreshResult = await refresh().unwrap();
          if (cancelled) return;
          if (refreshResult?.user) {
            dispatch(setCredentials(refreshResult.user));
            return;
          }
        } catch {
          // refresh failed
        }

        dispatch(loggedOut());
      } catch {
        if (!cancelled) dispatch(loggedOut());
      }
    };

    if (status === "idle") {
      hydrate();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "idle" || status === "loading") {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return children;
}

export function RequireAuth({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export function PublicOnly({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

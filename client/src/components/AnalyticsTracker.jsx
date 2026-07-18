import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "state/authSlice";
import { initAnalytics, trackPageView } from "utils/analytics";

/**
 * Initializes client analytics and records page views for authenticated sessions.
 * Ingest is auth-gated on the server; viewing aggregates is admin-only.
 */
const AnalyticsTracker = () => {
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!initialized.current) {
      initAnalytics();
      initialized.current = true;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const path = `${location.pathname}${location.search || ""}`;
    trackPageView(path || "/");
  }, [isAuthenticated, location.pathname, location.search]);

  return null;
};

export default AnalyticsTracker;

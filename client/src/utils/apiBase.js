/**
 * Resolve the API base URL for fetch / window.location.
 * Empty or unset VITE_API_BASE_URL → same-origin "/" (Docker/nginx proxy).
 * In Vite dev only, fall back to local API if the env var is omitted.
 */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw != null && String(raw).trim() !== "") {
    const base = String(raw).trim();
    return base.endsWith("/") ? base : `${base}/`;
  }
  if (import.meta.env.DEV) {
    return "http://localhost:5000/";
  }
  return "/";
}

import { getApiBaseUrl } from "./apiBase";

const SESSION_KEY = "dink_analytics_sid";
const SESSION_STARTED_KEY = "dink_analytics_started";
const QUEUE_FLUSH_MS = 1500;
const MAX_BATCH = 20;

let queue = [];
let flushTimer = null;
let contextCache = null;
let listenersBound = false;

/**
 * Collect usage analytics only for production deployments.
 * Skips Vite/dev builds and anything served from localhost.
 */
function isAnalyticsEnabled() {
  if (!import.meta.env.PROD) return false;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]";
}

function apiUrl(path) {
  return `${getApiBaseUrl()}${path.replace(/^\//, "")}`;
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return uuid();
  }
}

function parseUa() {
  const ua = navigator.userAgent || "";
  let os = "unknown";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  const w = window.innerWidth || 0;
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  let device_type = "desktop";
  if (w > 0 && w < 768) device_type = "mobile";
  else if (w >= 768 && w < 1024 && coarse) device_type = "tablet";
  else if (/Mobi|Android|iPhone|iPod/i.test(ua)) device_type = "mobile";
  else if (/iPad|Tablet/i.test(ua)) device_type = "tablet";

  return {
    device_type,
    os,
    browser,
    viewport_w: window.innerWidth || null,
    viewport_h: window.innerHeight || null,
  };
}

function getContext() {
  if (!contextCache) contextCache = parseUa();
  return {
    ...contextCache,
    viewport_w: window.innerWidth || contextCache.viewport_w,
    viewport_h: window.innerHeight || contextCache.viewport_h,
  };
}

async function sendBatch(events) {
  if (!events.length) return;
  try {
    await fetch(apiUrl("api/usage/ingest"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    // Fire-and-forget: never block the UI on analytics failures.
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, QUEUE_FLUSH_MS);
}

export async function flush() {
  if (!isAnalyticsEnabled() || !queue.length) return;
  const batch = queue.splice(0, MAX_BATCH);
  await sendBatch(batch);
  if (queue.length) await flush();
}

/**
 * Queue an analytics event. Safe to call from anywhere; no-ops quietly on failure.
 * @param {'page_view'|'session_start'|'auth'|'action'|'error'|'web_vital'} eventType
 * @param {{ path?: string, properties?: Record<string, unknown>, referrer?: string }} [opts]
 */
export function track(eventType, opts = {}) {
  if (!isAnalyticsEnabled()) return;

  const ctx = getContext();
  const event = {
    event_type: eventType,
    session_id: getSessionId(),
    path: opts.path ?? (window.location.hash?.replace(/^#/, "") || window.location.pathname),
    referrer: opts.referrer ?? (document.referrer || null),
    device_type: ctx.device_type,
    os: ctx.os,
    browser: ctx.browser,
    viewport_w: ctx.viewport_w,
    viewport_h: ctx.viewport_h,
    properties: opts.properties ?? null,
  };

  queue.push(event);
  if (queue.length >= MAX_BATCH) flush();
  else scheduleFlush();
}

export function trackPageView(path) {
  track("page_view", { path });
}

export function trackAction(name, properties = {}) {
  track("action", { properties: { name, ...properties } });
}

export function trackAuth(action, properties = {}) {
  track("auth", { properties: { action, ...properties } });
}

export function trackError(error, properties = {}) {
  const message =
    typeof error === "string"
      ? error
      : error?.message || "Unknown error";
  track("error", {
    properties: {
      message: String(message).slice(0, 500),
      name: error?.name,
      stack: typeof error?.stack === "string" ? error.stack.slice(0, 1000) : undefined,
      ...properties,
    },
  });
}

export function ensureSessionStart() {
  try {
    if (sessionStorage.getItem(SESSION_STARTED_KEY)) return;
    sessionStorage.setItem(SESSION_STARTED_KEY, "1");
  } catch {
    // ignore
  }
  track("session_start");
}

function trackWebVital(name, value, extra = {}) {
  if (value == null || Number.isNaN(value)) return;
  track("web_vital", {
    properties: {
      name,
      value: Math.round(value * 100) / 100,
      ...extra,
    },
  });
}

function bindWebVitals() {
  try {
    if (typeof PerformanceObserver === "undefined") return;

    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) trackWebVital("LCP", last.startTime);
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

    let cls = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) cls += entry.value;
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });

    const reportCls = () => trackWebVital("CLS", cls);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") reportCls();
    });
    window.addEventListener("pagehide", reportCls);
  } catch {
    // Optional metrics — ignore unsupported browsers.
  }
}

function bindErrorListeners() {
  if (listenersBound) return;
  listenersBound = true;

  window.addEventListener("error", (event) => {
    trackError(event.error || event.message, {
      source: "window.error",
      filename: event.filename,
      lineno: event.lineno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    trackError(event.reason, { source: "unhandledrejection" });
  });

  window.addEventListener("pagehide", () => flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

/** Call once after the user is authenticated. No-ops in local/dev. */
export function initAnalytics() {
  if (!isAnalyticsEnabled()) return;
  ensureSessionStart();
  bindErrorListeners();
  bindWebVitals();
}

/**
 * Parse API timestamps as UTC, then format in the viewer's local timezone.
 * MySQL DATETIME values are stored as UTC; bare "YYYY-MM-DD HH:mm:ss" strings
 * are treated as UTC when they lack an explicit offset.
 */

export function parseDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // Date-only calendar keys (charts / heatmaps) — noon local avoids off-by-one
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // MySQL DATETIME without timezone → UTC
  const mysql = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?$/
  );
  if (mysql) {
    const d = new Date(`${mysql[1]}T${mysql[2]}${mysql[3] || ""}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value, options = {}) {
  const d = parseDate(value);
  if (!d) return value == null || value === "" ? "" : String(value);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

export function formatDateTime(value, options = {}) {
  const d = parseDate(value);
  if (!d) return value == null || value === "" ? "" : String(value);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  });
}

export function formatDateShort(value) {
  const d = parseDate(value);
  if (!d) return value == null || value === "" ? "" : String(value);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Chart axis labels for month buckets (YYYY-MM or Date) — matches Firsts/Juice. */
export function formatMonthLabel(value) {
  if (value == null || value === "") return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}-01T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
  }
  const d = parseDate(raw);
  if (!d) return raw;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** UTC YYYY-MM-DD helpers for the contribution calendar. */

export function toDateOnlyUTC(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function rollingYearRange(end = new Date()) {
  const endDate = toDateOnlyUTC(end);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 364);
  return { startDate: toDateOnlyUTC(start), endDate, key: "last" };
}

export function calendarYearRange(year) {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    key: String(year),
  };
}

/** Years the member was active, newest first, plus a "Last year" rolling option. */
export function buildYearOptions(firstMessageDate, lastMessageDate) {
  const options = [{ label: "Last year", ...rollingYearRange() }];
  if (!firstMessageDate || !lastMessageDate) return options;

  const startYear = Number(firstMessageDate.slice(0, 4));
  const endYear = Number(lastMessageDate.slice(0, 4));
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return options;

  for (let y = endYear; y >= startYear; y -= 1) {
    options.push({ label: String(y), ...calendarYearRange(y) });
  }
  return options;
}

/** Longest and current streaks from a sparse `{ date, messages }[]` list. */
export function computeStreaks(dailyRows, endDateStr) {
  const active = new Set(
    (dailyRows || [])
      .filter((r) => Number(r.messages) > 0)
      .map((r) => r.date)
  );

  if (active.size === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const sorted = [...active].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00Z`);
    const cur = new Date(`${sorted[i]}T00:00:00Z`);
    const diff = (cur - prev) / 86400000;
    if (diff === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  let current = 0;
  let cursor = endDateStr;
  // Allow "today" with 0 messages to still count yesterday as current streak
  if (!active.has(cursor)) {
    const d = new Date(`${cursor}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  while (active.has(cursor)) {
    current += 1;
    const d = new Date(`${cursor}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }

  return { currentStreak: current, longestStreak: longest };
}

export function formatCompactCount(num) {
  const n = Number(num) || 0;
  if (n >= 10000) return `${Math.floor(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

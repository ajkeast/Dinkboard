/**
 * Cumulative count at or before `time`.
 * Points are `{ timesent, cum_count }` and may arrive unsorted.
 * Returns 0 when the series has no events yet at that time.
 */
export function cumulativeCountAt(points, time) {
  const target = Number(time);
  if (!Array.isArray(points) || !Number.isFinite(target)) return 0;

  let bestTime = -Infinity;
  let bestValue = 0;

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const t = Number(point?.timesent);
    if (!Number.isFinite(t) || t > target || t < bestTime) continue;
    const value = Number(point?.cum_count);
    if (!Number.isFinite(value)) continue;
    bestTime = t;
    bestValue = value;
  }

  return bestValue;
}

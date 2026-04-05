const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;

const store = new Map<string, number[]>();

export function checkRateLimit(
  key: string
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  const timestamps = (store.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    const retryAfterMs = WINDOW_MS - (now - timestamps[0]);
    store.set(key, timestamps);
    return { allowed: false, retryAfterMs };
  }

  store.set(key, [...timestamps, now]);
  return { allowed: true };
}

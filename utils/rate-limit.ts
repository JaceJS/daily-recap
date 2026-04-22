import { env } from "@/config/env";
import { requestServerJson } from "@/lib/http/server";

const LIMITS = [
  { limit: 5, windowSec: 60 },
  { limit: 30, windowSec: 60 * 60 },
] as const;
const IN_MEMORY_WINDOW_MS = LIMITS[1].windowSec * 1000;

type PipelineItem = { result?: unknown; error?: string };
type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

const fallbackStore = new Map<string, number[]>();
let hasWarnedFallback = false;

function getWindowKey(key: string, windowSec: number, now: number): string {
  const bucket = Math.floor(now / (windowSec * 1000));
  return `rate:generate:${key}:${windowSec}:${bucket}`;
}

function getResetMs(now: number, windowSec: number): number {
  const windowMs = windowSec * 1000;
  return windowMs - (now % windowMs);
}

function getPipelineCount(item: PipelineItem | undefined): number {
  if (item?.error) {
    throw new Error(`Upstash rate limit error: ${item.error}`);
  }

  return Number(item?.result ?? 0);
}

function warnFallbackOnce() {
  if (hasWarnedFallback) return;
  hasWarnedFallback = true;
  console.warn(
    "[rate-limit] Upstash Redis is not configured. Falling back to in-memory rate limiting. This is okay for local/small usage, but shared Redis is safer for public/serverless deploys.",
  );
}

function checkInMemoryRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const timestamps = (fallbackStore.get(key) ?? []).filter(
    (timestamp) => now - timestamp < IN_MEMORY_WINDOW_MS,
  );
  const minuteWindowMs = LIMITS[0].windowSec * 1000;
  const minuteTimestamps = timestamps.filter(
    (timestamp) => now - timestamp < minuteWindowMs,
  );

  let retryAfterMs = 0;

  if (minuteTimestamps.length >= LIMITS[0].limit) {
    retryAfterMs = Math.max(
      retryAfterMs,
      minuteWindowMs - (now - minuteTimestamps[0]),
    );
  }

  if (timestamps.length >= LIMITS[1].limit) {
    retryAfterMs = Math.max(
      retryAfterMs,
      IN_MEMORY_WINDOW_MS - (now - timestamps[0]),
    );
  }

  if (retryAfterMs > 0) {
    fallbackStore.set(key, timestamps);
    return { allowed: false, retryAfterMs };
  }

  fallbackStore.set(key, [...timestamps, now]);
  return { allowed: true };
}

export async function checkRateLimit(
  key: string,
): Promise<RateLimitResult> {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    warnFallbackOnce();
    return checkInMemoryRateLimit(key);
  }

  const now = Date.now();
  const commands = LIMITS.flatMap(({ windowSec }) => {
    const redisKey = getWindowKey(key, windowSec, now);
    return [
      ["INCR", redisKey],
      ["EXPIRE", redisKey, String(windowSec)],
    ];
  });

  const response = await requestServerJson<PipelineItem[]>(
    `${env.UPSTASH_REDIS_REST_URL}/pipeline`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      errorPrefix: "Rate limit request failed",
      timeoutMs: 5_000,
    },
  );

  let retryAfterMs = 0;

  for (let index = 0; index < LIMITS.length; index += 1) {
    const { limit, windowSec } = LIMITS[index];
    const count = getPipelineCount(response[index * 2]);
    if (count > limit) {
      retryAfterMs = Math.max(retryAfterMs, getResetMs(now, windowSec));
    }
  }

  if (retryAfterMs > 0) {
    return { allowed: false, retryAfterMs };
  }

  return { allowed: true };
}

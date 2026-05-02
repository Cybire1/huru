import { runtimeConfig } from "@/lib/huru/config";

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  dailyCount: number;
  dailyResetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  headers: Record<string, string>;
}

const buckets = new Map<string, TokenBucket>();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const STALE_TTL_MS = 10 * 60 * 1000;

let lastCleanup = Date.now();

function getNextMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.getTime();
}

function refillBucket(bucket: TokenBucket, now: number): void {
  const elapsed = now - bucket.lastRefill;
  const refillRate = runtimeConfig.rateLimitPerMinute / 60000;
  const newTokens = elapsed * refillRate;
  bucket.tokens = Math.min(
    runtimeConfig.rateLimitPerMinute,
    bucket.tokens + newTokens,
  );
  bucket.lastRefill = now;

  if (now >= bucket.dailyResetAt) {
    bucket.dailyCount = 0;
    bucket.dailyResetAt = getNextMidnight();
  }
}

function cleanupStaleBuckets(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > STALE_TTL_MS) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(projectPublicId: string): RateLimitResult {
  const now = Date.now();
  cleanupStaleBuckets(now);

  let bucket = buckets.get(projectPublicId);
  if (!bucket) {
    bucket = {
      tokens: runtimeConfig.rateLimitPerMinute,
      lastRefill: now,
      dailyCount: 0,
      dailyResetAt: getNextMidnight(),
    };
    buckets.set(projectPublicId, bucket);
  }

  refillBucket(bucket, now);

  const minuteRemaining = Math.floor(bucket.tokens);
  const dailyRemaining = runtimeConfig.rateLimitPerDay - bucket.dailyCount;

  if (bucket.tokens < 1) {
    const tokensNeeded = 1 - bucket.tokens;
    const refillRate = runtimeConfig.rateLimitPerMinute / 60000;
    const retryAfterMs = Math.ceil(tokensNeeded / refillRate);
    const resetAt = Math.ceil((now + retryAfterMs) / 1000);

    return {
      allowed: false,
      headers: {
        "X-RateLimit-Limit": String(runtimeConfig.rateLimitPerMinute),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(resetAt),
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
      },
    };
  }

  if (dailyRemaining <= 0) {
    const retryAfterMs = bucket.dailyResetAt - now;
    const resetAt = Math.ceil(bucket.dailyResetAt / 1000);

    return {
      allowed: false,
      headers: {
        "X-RateLimit-Limit": String(runtimeConfig.rateLimitPerDay),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(resetAt),
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
      },
    };
  }

  bucket.tokens -= 1;
  bucket.dailyCount += 1;

  const resetAt = Math.ceil((now + 60000) / 1000);

  return {
    allowed: true,
    headers: {
      "X-RateLimit-Limit": String(runtimeConfig.rateLimitPerMinute),
      "X-RateLimit-Remaining": String(Math.max(0, Math.floor(bucket.tokens))),
      "X-RateLimit-Reset": String(resetAt),
    },
  };
}

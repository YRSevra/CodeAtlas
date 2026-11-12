export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtSeconds: number;
  retryAfterSeconds: number;
}

interface BucketEntry {
  count: number;
  windowStartMs: number;
}

const buckets = new Map<string, BucketEntry>();
const MAX_BUCKETS = 2000;

/**
 * In-memory fixed-window rate limiter per client key and endpoint.
 * Suitable for single-instance protection; note in docs that distributed deployments should back with Redis.
 */
export function checkRateLimit(
  key: string,
  options: { limit?: number; windowMs?: number } = {}
): RateLimitResult {
  const limit = options.limit ?? 30;
  const windowMs = options.windowMs ?? 60_000;
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    for (const [entryKey, entry] of buckets.entries()) {
      if (now - entry.windowStartMs >= windowMs) {
        buckets.delete(entryKey);
      }
    }
  }

  const existing = buckets.get(key);
  if (!existing || now - existing.windowStartMs >= windowMs) {
    buckets.set(key, { count: 1, windowStartMs: now });
    const resetAtSeconds = Math.ceil((now + windowMs) / 1000);
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAtSeconds,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= limit) {
    const resetMs = existing.windowStartMs + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetMs - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAtSeconds: Math.ceil(resetMs / 1000),
      retryAfterSeconds,
    };
  }

  existing.count += 1;
  const resetAtSeconds = Math.ceil((existing.windowStartMs + windowMs) / 1000);
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAtSeconds,
    retryAfterSeconds: 0,
  };
}

export function getClientIdentifier(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "local-client";
}

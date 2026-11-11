import { isIP } from "node:net";

type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export function createRateLimiter(
  now: () => number = Date.now,
  maxClients = 10_000,
) {
  const buckets = new Map<string, Bucket>();

  return {
    consume(
      client: string,
      scope: string,
      { limit, windowMs }: RateLimitPolicy,
    ): { allowed: boolean; retryAfter: number } {
      const currentTime = now();
      const key = `${scope}:${client}`;
      const existing = buckets.get(key);

      if (existing && existing.resetAt > currentTime) {
        existing.count += 1;
        buckets.delete(key);
        buckets.set(key, existing);
        return {
          allowed: existing.count <= limit,
          retryAfter: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000)),
        };
      }

      if (buckets.size >= maxClients) {
        for (const [bucketKey, bucket] of buckets) {
          if (bucket.resetAt <= currentTime) buckets.delete(bucketKey);
        }
        if (buckets.size >= maxClients) {
          const oldestKey = buckets.keys().next().value;
          if (oldestKey !== undefined) buckets.delete(oldestKey);
        }
      }

      buckets.set(key, { count: 1, resetAt: currentTime + windowMs });
      return { allowed: true, retryAfter: Math.max(1, Math.ceil(windowMs / 1000)) };
    },
  };
}

const policies: Record<string, RateLimitPolicy> = {
  search: { limit: 12, windowMs: 60_000 },
  "checkout-orders": { limit: 6, windowMs: 60_000 },
  "checkout-capture": { limit: 6, windowMs: 60_000 },
};

const limiter = createRateLimiter();

function getClientAddress(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && isIP(realIp)) return realIp;

  const forwardedIp = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  if (forwardedIp && isIP(forwardedIp)) return forwardedIp;

  return "unknown";
}

export function rateLimitRequest(
  request: Request,
  scope: keyof typeof policies,
): Response | null {
  const { allowed, retryAfter } = limiter.consume(
    getClientAddress(request),
    scope,
    policies[scope],
  );
  if (allowed) return null;

  return Response.json(
    { error: "Too many requests. Please wait before trying again." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
      },
    },
  );
}

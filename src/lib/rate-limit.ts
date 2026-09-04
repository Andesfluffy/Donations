import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting for the donation endpoints.
 *
 * Donation forms are a standing target for card-testing: attackers run stolen
 * card numbers through them in bulk because a charity checkout is public,
 * cheap to hit, and the small amounts attract little attention. Stripe Radar
 * catches much of it, but the cheapest place to stop a flood is before it
 * reaches Stripe at all — every attempt that gets through costs us a request
 * and drags down our authorisation rate.
 *
 * Uses Upstash when configured. Without it, falls back to an in-process
 * limiter: correct for a single dev server, but NOT sufficient in production
 * where requests are spread across instances — `rateLimitBackend()` reports
 * which is active so deployment checks can assert on it.
 */

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 8;

const upstashConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const upstashLimiter = upstashConfigured
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS, `${WINDOW_SECONDS} s`),
      prefix: "ccr:donate",
      analytics: false,
    })
  : null;

/** Fallback bucket store. Bounded so a flood of distinct keys cannot grow it
 *  without limit. */
const buckets = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 10_000;

function inProcessLimit(key: string) {
  const now = Date.now();
  const windowStart = now - WINDOW_SECONDS * 1000;

  const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart);
  hits.push(now);

  if (buckets.size > MAX_TRACKED_KEYS) buckets.clear();
  buckets.set(key, hits);

  return {
    success: hits.length <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - hits.length),
    reset: now + WINDOW_SECONDS * 1000,
  };
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  if (upstashLimiter) {
    const result = await upstashLimiter.limit(key);
    return { success: result.success, remaining: result.remaining, reset: result.reset };
  }
  return inProcessLimit(key);
}

export function rateLimitBackend(): "upstash" | "in-process" {
  return upstashLimiter ? "upstash" : "in-process";
}

/**
 * Best-effort client identity. Behind Vercel the leftmost x-forwarded-for entry
 * is the real client; it is spoofable in general, so this throttles casual
 * abuse rather than a determined attacker — Stripe Radar is the backstop.
 */
export function clientIdentifier(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

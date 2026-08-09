import { NextResponse } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window per-key counters, in-process memory. This app runs as a
 * single traditional Node server (see lib/server/localImageStorage.ts's own
 * comment on why — local-filesystem uploads require it), so this isn't
 * shared across instances/regions; if that ever changes, swap this for a
 * shared store (Redis/Upstash) instead. Good enough to blunt casual abuse
 * and accidental retry storms, not a substitute for a CDN/WAF for real DDoS.
 */
const buckets = new Map<string, Bucket>();

// Opportunistic sweep so long-lived processes don't leak memory from
// one-off IPs that never come back — runs every Nth call rather than on a
// timer, so it costs nothing when the app is idle.
let callsSinceSweep = 0;
function sweepExpired(now: number) {
  callsSinceSweep += 1;
  if (callsSinceSweep < 200) return;
  callsSinceSweep = 0;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function getClientIp(request: Request): string {
  // Standard proxy/load-balancer header; first entry is the original client.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // No proxy header (e.g. local dev) — better to under-isolate than to
  // silently disable rate limiting entirely.
  return "unknown";
}

/**
 * Returns a ready-to-return 429 NextResponse if `key` has exceeded `limit`
 * requests within `windowMs`, or null if the request is allowed (and counts
 * it toward the window). Callers should `return` the result immediately if
 * non-null: `const limited = rateLimit(...); if (limited) return limited;`
 */
export function rateLimit(
  request: Request,
  routeKey: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): NextResponse | null {
  const now = Date.now();
  sweepExpired(now);

  const key = `${routeKey}:${getClientIp(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  bucket.count += 1;
  return null;
}

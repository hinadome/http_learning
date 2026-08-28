import { NextResponse } from "next/server";

export type OutboundApiBucket = "send" | "ws" | "mqtt";

interface Window {
  count: number;
  windowStart: number;
}

/** Per-bucket, per-IP fixed windows (in-memory; per serverless instance). */
const stores = new Map<OutboundApiBucket, Map<string, Window>>();

const DEFAULT_LIMITS: Record<
  OutboundApiBucket,
  { max: number; windowMs: number }
> = {
  send: { max: 30, windowMs: 60_000 },
  ws: { max: 15, windowMs: 60_000 },
  mqtt: { max: 15, windowMs: 60_000 },
};

function limitsFor(bucket: OutboundApiBucket) {
  const base = DEFAULT_LIMITS[bucket];
  const maxEnv =
    bucket === "send"
      ? process.env.RATE_LIMIT_SEND_MAX
      : bucket === "ws"
        ? process.env.RATE_LIMIT_WS_MAX
        : process.env.RATE_LIMIT_MQTT_MAX;
  const windowEnv = process.env.RATE_LIMIT_WINDOW_MS;
  const max = maxEnv ? Math.max(1, parseInt(maxEnv, 10) || base.max) : base.max;
  const windowMs = windowEnv
    ? Math.max(1000, parseInt(windowEnv, 10) || base.windowMs)
    : base.windowMs;
  return { max, windowMs };
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  return "unknown";
}

function pruneStore(store: Map<string, Window>, windowMs: number, now: number) {
  if (store.size < 256) return;
  for (const [ip, entry] of store) {
    if (now - entry.windowStart >= windowMs) store.delete(ip);
  }
}

/**
 * Returns a 429 response when the client IP exceeded the bucket limit, else null.
 */
export function enforceOutboundRateLimit(
  request: Request,
  bucket: OutboundApiBucket
): NextResponse | null {
  const { max, windowMs } = limitsFor(bucket);
  const ip = getClientIp(request);
  let store = stores.get(bucket);
  if (!store) {
    store = new Map();
    stores.set(bucket, store);
  }

  const now = Date.now();
  pruneStore(store, windowMs, now);

  let entry = store.get(ip);
  if (!entry || now - entry.windowStart >= windowMs) {
    entry = { count: 0, windowStart: now };
    store.set(ip, entry);
  }

  entry.count += 1;

  if (entry.count > max) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((entry.windowStart + windowMs - now) / 1000)
    );
    return NextResponse.json(
      {
        error: "Too many requests from this IP. Try again shortly.",
        bucket,
        retryAfterSec,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(max),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}

/** @internal test helper */
export function resetOutboundRateLimitsForTests(): void {
  stores.clear();
}

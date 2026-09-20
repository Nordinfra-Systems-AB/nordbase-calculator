// Lightweight, dependency-free rate limiter shared by stats.js and
// submit-lead.js. No new service, no new environment variable — added
// 2026-09-20 per Simon's request after a review of the site's exposure to
// intrusion/abuse flagged that neither public API route had any throttling
// (verified live: 5 rapid requests to /api/stats all went through with no
// 429 before this change).
//
// HOW IT WORKS: counts requests per client IP in a fixed window, held in a
// plain in-memory Map for the lifetime of the serverless function instance.
//
// KNOWN LIMITATION, on purpose: Vercel can run several warm instances of
// the same function behind the scenes, and a cold start resets this Map to
// empty — so this is a best-effort brake against a single scripted client
// hammering one endpoint, NOT a guaranteed global cap against a distributed
// botnet. For what these two endpoints actually are (a small B2B lead form
// and an internal stats page, not a high-value target), that trade-off is
// reasonable rather than adding Vercel KV/Upstash Redis and new env vars
// for a real distributed limiter. If real abuse ever shows up, that's the
// documented next step — not built here.

const buckets = new Map();

// Cheap, timer-free cleanup so the Map doesn't grow forever on a
// long-lived warm instance — runs on a small random fraction of calls
// instead of on every call.
function prune(now) {
  for (const [key, entry] of buckets) {
    if (now - entry.windowStart > 10 * 60 * 1000) buckets.delete(key);
  }
}

function clientIp(req) {
  // Vercel sets x-forwarded-for on every request; the first entry is the
  // original client (the rest, if any, are proxies in between).
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

// Returns { limited, remaining, retryAfterSeconds }.
export function rateLimit(req, { windowMs, max, keyPrefix }) {
  const now = Date.now();
  if (Math.random() < 0.02) prune(now);

  const key = `${keyPrefix}:${clientIp(req)}`;
  let entry = buckets.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    entry = { windowStart: now, count: 0 };
    buckets.set(key, entry);
  }

  entry.count += 1;

  if (entry.count > max) {
    return {
      limited: true,
      remaining: 0,
      retryAfterSeconds: Math.ceil((entry.windowStart + windowMs - now) / 1000),
    };
  }

  return { limited: false, remaining: max - entry.count, retryAfterSeconds: 0 };
}

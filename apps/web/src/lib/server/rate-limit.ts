/**
 * In-memory rate limiter for auth endpoints.
 *
 * Best-effort single-instance protection. For multi-instance deployments,
 * replace with Redis-backed solution (e.g. @upstash/ratelimit).
 */

const MAX_STORE_SIZE = 10_000

const store = new Map<string, { count: number; resetAt: number }>()

// Periodic cleanup — purge expired entries
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL && store.size < MAX_STORE_SIZE) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

export interface RateLimitConfig {
  /** Max requests allowed within the window */
  maxRequests: number
  /** Window size in seconds */
  windowSeconds: number
}

/**
 * Check if a key has exceeded the rate limit.
 * Returns { allowed: true } or { allowed: false, retryAfter: seconds }.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = Date.now()
  cleanup(now)

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // Evict oldest entry if store is full before inserting a new one
    if (!entry && store.size >= MAX_STORE_SIZE) {
      let oldestKey = ""
      let oldestTime = Infinity
      for (const [k, e] of store) {
        if (e.resetAt < oldestTime) { oldestTime = e.resetAt; oldestKey = k }
      }
      if (oldestKey) store.delete(oldestKey)
    }
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 })
    return { allowed: true }
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  entry.count++
  return { allowed: true }
}

/**
 * Extract a rate-limit key from a Request.
 * Checks common proxy headers; falls back to a coarse per-route
 * bucket. Using a per-request random UUID is a footgun: every
 * request gets a unique bucket, so the limit is effectively
 * disabled for unproxied traffic. A single "unknown" bucket
 * is the right fallback: the limit is shared across all
 * unidentifiable callers, which is at least meaningful, and
 * they can't be locked out by a different anonymous caller.
 */
export function getRateLimitKey(request: Request, route: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    request.headers.get("cf-connecting-ip")?.trim() ??
    null

  if (ip) return ip

  // No IP available — use a route-scoped shared bucket. In dev /
  // when running behind no proxy, this means /api/auth/login's
  // bucket is shared with every other unauth request to that
  // route. That's the safer failure mode: it errs on the side
  // of throttling anonymous traffic rather than letting
  // unbounded traffic through.
  return `unknown:${route}`
}

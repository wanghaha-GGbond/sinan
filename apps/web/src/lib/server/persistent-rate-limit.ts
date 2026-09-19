import crypto from "node:crypto"
import { sql } from "drizzle-orm"

import { checkRateLimit, type RateLimitConfig } from "@/lib/server/rate-limit"

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
let lastCleanupAt = 0

/**
 * Atomic rate limiter for writes that can create moderation/database load.
 * Production uses PostgreSQL so limits survive restarts and multiple app
 * instances; local preview falls back to the existing in-memory limiter.
 */
export async function checkPersistentRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.NEXT_PUBLIC_APP_ENV === "production"

  // Abuse-sensitive writes must not silently downgrade to a process-local
  // limiter in a deployed environment. If the database is unavailable, fail
  // closed until the operator restores the persistent bucket.
  if (!process.env.DATABASE_URL) {
    if (isProduction) {
      console.error("[rate-limit] DATABASE_URL is required for production limits")
      return { allowed: false, retryAfter: 60 }
    }
    return checkRateLimit(key, config)
  }

  const bucketKey = crypto.createHash("sha256").update(key).digest("hex")
  const now = new Date()
  const resetAt = new Date(now.getTime() + config.windowSeconds * 1000)

  try {
    const { db } = await import("@/db/client")
    const { securityRateLimits } = await import("@/db/schema/security-rate-limits")

    // Keep attacker-controlled IP/fingerprint buckets from growing without
    // bound. Cleanup is deliberately throttled per process; the reset index
    // makes this cheap and another instance can perform the same sweep.
    if (Date.now() - lastCleanupAt >= CLEANUP_INTERVAL_MS) {
      lastCleanupAt = Date.now()
      await db.delete(securityRateLimits).where(sql`${securityRateLimits.resetAt} <= now()`)
    }

    const [row] = await db
      .insert(securityRateLimits)
      .values({ key: bucketKey, count: 1, resetAt, updatedAt: now })
      .onConflictDoUpdate({
        target: securityRateLimits.key,
        set: {
          count: sql`CASE WHEN ${securityRateLimits.resetAt} <= now() THEN 1 ELSE ${securityRateLimits.count} + 1 END`,
          resetAt: sql`CASE WHEN ${securityRateLimits.resetAt} <= now() THEN ${resetAt} ELSE ${securityRateLimits.resetAt} END`,
          updatedAt: now,
        },
      })
      .returning({ count: securityRateLimits.count, resetAt: securityRateLimits.resetAt })

    if (!row || Number(row.count) > config.maxRequests) {
      const retryAfter = Math.max(
        1,
        Math.ceil(((row?.resetAt?.getTime() ?? resetAt.getTime()) - Date.now()) / 1000),
      )
      return { allowed: false, retryAfter }
    }
    return { allowed: true }
  } catch (error) {
    // A missing migration should not take down local previews. Production
    // instead fails closed so a schema outage cannot reopen an unlimited
    // anonymous write path.
    console.error("[rate-limit] persistent bucket unavailable:", error)
    if (isProduction) return { allowed: false, retryAfter: 60 }
    return checkRateLimit(key, config)
  }
}

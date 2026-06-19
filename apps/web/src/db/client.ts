import { Pool, neonConfig } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-serverless"

import * as schema from "./schema"

/**
 * Drizzle + Neon Postgres client.
 *
 * Why neon-serverless (WebSocket) instead of neon-http:
 *   The HTTP driver silently batches every "transaction" into a single
 *   fetch — it can't actually BEGIN/COMMIT/ROLLBACK. That meant:
 *     - `db.transaction(async (tx) => …)` did NOT roll back on error
 *     - `.for("update")` released locks immediately (no session, no lock)
 *     - `pg_advisory_xact_lock` was no-op
 *   22 sites across 8 service files were affected (auction-engine,
 *   verification, dm-engine, circles, invites, …). Switching to the
 *   WebSocket Pool driver gives a real PG session so all of the above
 *   actually work as written.
 *
 * Why no `ws` polyfill:
 *   Node 22+ ships with a global `WebSocket`. The Edge-runtime OG
 *   route (`/api/og/sentiment`) doesn't import this module, so we don't
 *   need to be Edge-safe here. If a future route needs DB access from
 *   Edge, route to a sibling module that uses `neon-http`.
 *
 * Connection-cache strategy:
 *   `poolQueryViaFetch = true` lets the Neon Pool send non-listenening
 *   queries through Neon's HTTP cache endpoint (lower latency). Pool-
 *   bound transactions still go over WebSocket.
 *
 * Lazy-throw on missing DATABASE_URL:
 *   Module load throws if `DATABASE_URL` is unset, but service code uses
 *   `await import("@/db/client")` inside request handlers, so dev mode
 *   with no DB still serves routes that don't hit the DB (home, static
 *   pages, OG images, etc.) and fails loudly on the first DB touch.
 */

if (typeof globalThis.WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = globalThis.WebSocket
}
neonConfig.poolQueryViaFetch = true

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set")
}

const pool = new Pool({ connectionString: databaseUrl })

export const db = drizzle(pool, { schema })
export { pool }
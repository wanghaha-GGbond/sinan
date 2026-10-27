import { sql, type SQL } from "drizzle-orm"
import journal from "@/db/migrations/meta/_journal.json"

const latest = journal.entries[journal.entries.length - 1]
export const readinessContract = { migration: latest.tag, authContract: 2 } as const

/** No user data is read. Missing migrations or columns must fail closed. */
export async function verifyReadinessSchema(execute: (query: SQL) => Promise<{ rows: unknown[] }>) {
  const result = await execute(sql`
    select id from drizzle.__drizzle_migrations where created_at = ${latest.when} limit 1
  `)
  if (result.rows.length !== 1) throw new Error("Required migration is missing")
  await execute(sql`
    select u.session_version, u.email_verified_at, t.token_hash, t.session_version, t.expires_at,
      r.count, r.reset_at, c.code_hash, c.attempts, c.delivered_at, c.expires_at
    from users u, password_reset_tokens t, security_rate_limits r, registration_codes c where false
  `)
}

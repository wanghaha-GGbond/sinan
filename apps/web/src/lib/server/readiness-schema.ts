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
      r.count, r.reset_at, c.code_hash, c.attempts, c.delivered_at, c.expires_at,
      p.day, p.energy, p.pressure, p.work_minutes, p.company_id, p.end_minute
    from users u, password_reset_tokens t, security_rate_limits r, registration_codes c, pulse_checkins p where false
  `)
  await execute(sql`select f.status, f.company_id, f.request_id, r.post_id, r.request_id, v.user_id, s.company_id, p.reason, e.to_status
    from forum_posts f, forum_replies r, forum_votes v, forum_follows s, forum_reports p, forum_moderation_events e where false`)
  await execute(sql`select s.status, s.request_id, s.guest_consent_confirmed, s.recap_consent_confirmed, s.private_instructions,
    a.user_id, a.request_id, a.question, a.status, e.actor_user_id
    from dialogue_sessions s, dialogue_applications a, dialogue_audit_events e where false`)
}

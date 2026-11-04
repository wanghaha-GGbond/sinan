import { sql } from "drizzle-orm"
import { publicPulsePoints, pulseDay, shiftPulseDay, PULSE_REPORT_DAYS, PULSE_MIN_PARTICIPANTS } from "@/lib/pulse"

export async function eligiblePulseCompanies(userId: string) {
  const { db } = await import("@/db/client")
  const result = await db.execute(sql`
    SELECT DISTINCT c.id, c.name FROM companies c
    JOIN company_verifications v ON v.company_id = c.id
    JOIN users u ON u.id = v.applicant_user_id
    WHERE u.id = ${userId}::uuid AND u.status = 'active' AND u.deleted_at IS NULL
      AND u.email_verified_at IS NOT NULL AND c.deleted_at IS NULL AND c.review_status = 'reviewable'
      AND v.status = 'approved' AND v.reviewed_at >= now() - interval '365 days'
    ORDER BY c.name LIMIT 50
  `)
  return result.rows.map(row => ({ id: String(row.id), name: String(row.name) }))
}

/** Fixed completed days only. Threshold is enforced in SQL, before serialization.
 * No arbitrary date, department, role or user filters; one user/day primary key.
 * Rounding and bands reduce precision, but are not differential privacy. */
export async function getCompanyPulse(companyId: string, now = new Date()) {
  const { db } = await import("@/db/client")
  const today = pulseDay(now), start = shiftPulseDay(today, -PULSE_REPORT_DAYS)
  const result = await db.execute(sql`
    SELECT p.day::text AS day, count(DISTINCT p.user_id)::int AS participants,
      avg((p.energy - 1 + 10 - p.pressure) * 100.0 / 18) AS score
    FROM pulse_checkins p JOIN users u ON u.id = p.user_id
    WHERE p.company_id = ${companyId}::uuid AND p.day >= ${start}::date AND p.day < ${today}::date
      AND u.status = 'active' AND u.deleted_at IS NULL AND u.email_verified_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM company_verifications v
        WHERE v.applicant_user_id = p.user_id AND v.company_id = p.company_id AND v.status = 'approved'
          AND v.reviewed_at <= p.updated_at AND v.reviewed_at >= now() - interval '365 days')
    GROUP BY p.day HAVING count(DISTINCT p.user_id) >= ${PULSE_MIN_PARTICIPANTS}
    ORDER BY p.day
  `)
  const rows = result.rows.map(row => ({ day: String(row.day), participants: row.participants, score: row.score }))
  return { from: start, through: shiftPulseDay(today, -1), minimumParticipants: PULSE_MIN_PARTICIPANTS,
    points: publicPulsePoints(rows) }
}

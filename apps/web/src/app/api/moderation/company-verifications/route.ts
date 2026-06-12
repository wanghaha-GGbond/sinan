import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, sql } from "drizzle-orm"

import { requireModerator } from "@/lib/server/auth"
import { companyVerifications } from "@/db/schema/company-verifications"
import { users } from "@/db/schema/users"
import { companies } from "@/db/schema/companies"

const VALID_STATUSES = ["submitted", "reviewing", "approved", "rejected", "revoked"] as const
type VerifStatus = (typeof VALID_STATUSES)[number]

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/**
 * GET /api/moderation/company-verifications
 *
 * Moderator queue for L1/L2 verifications. Default status = "submitted".
 * ?proofType=work_email|business_document to filter by type.
 */
export async function GET(request: NextRequest) {
  try {
    await requireModerator()
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get("status")
  const proofType = searchParams.get("proofType")
  const limit = Math.min(Number(searchParams.get("limit") ?? DEFAULT_LIMIT), MAX_LIMIT)
  const cursor = searchParams.get("cursor") ?? undefined

  const status: VerifStatus = VALID_STATUSES.includes(statusParam as VerifStatus)
    ? (statusParam as VerifStatus)
    : "submitted"

  try {
    const { db } = await import("@/db/client")

    const conditions = [eq(companyVerifications.status, status)]
    if (proofType === "work_email" || proofType === "business_document") {
      conditions.push(eq(companyVerifications.proofType, proofType))
    }
    if (cursor) {
      conditions.push(sql`${companyVerifications.createdAt} < ${cursor}::timestamptz`)
    }

    const rows = await db
      .select({
        id: companyVerifications.id,
        companyId: companyVerifications.companyId,
        companyName: companyVerifications.companyName,
        applicantUserId: companyVerifications.applicantUserId,
        applicantName: companyVerifications.applicantName,
        workEmail: companyVerifications.workEmail,
        jobTitle: companyVerifications.jobTitle,
        proofType: companyVerifications.proofType,
        note: companyVerifications.note,
        status: companyVerifications.status,
        rejectReason: companyVerifications.rejectReason,
        grantedTrustLevel: companyVerifications.grantedTrustLevel,
        createdAt: companyVerifications.createdAt,
        reviewedAt: companyVerifications.reviewedAt,
        applicantDisplayName: users.displayName,
        applicantTrustLevel: users.trustLevel,
        companyShortName: companies.shortName,
      })
      .from(companyVerifications)
      .leftJoin(users, eq(users.id, companyVerifications.applicantUserId))
      .leftJoin(companies, eq(companies.id, companyVerifications.companyId))
      .where(and(...conditions))
      .orderBy(desc(companyVerifications.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const slice = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? slice[slice.length - 1].createdAt?.toISOString() : null

    return NextResponse.json({
      verifications: slice.map((r) => ({
        id: r.id,
        companyId: r.companyId,
        companyName: r.companyName,
        companyShortName: r.companyShortName,
        applicant: {
          id: r.applicantUserId,
          name: r.applicantName,
          displayName: r.applicantDisplayName,
          trustLevel: r.applicantTrustLevel,
        },
        workEmail: r.workEmail,
        jobTitle: r.jobTitle,
        proofType: r.proofType,
        note: r.note,
        status: r.status,
        rejectReason: r.rejectReason,
        grantedTrustLevel: r.grantedTrustLevel,
        createdAt: r.createdAt.toISOString(),
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
      })),
      nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error("[moderation/company-verifications] GET failed:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

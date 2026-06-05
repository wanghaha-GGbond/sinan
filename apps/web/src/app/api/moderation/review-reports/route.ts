import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, sql } from "drizzle-orm"
import { reviews } from "@/db/schema/reviews"
import { companies } from "@/db/schema/companies"
import { reviewReports } from "@/db/schema/review-reports"
import { requireModerator } from "@/lib/server/auth"

const VALID_STATUSES = [
  "open",
  "reviewing",
  "actioned",
  "dismissed",
] as const

type ReportStatus = (typeof VALID_STATUSES)[number]

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/**
 * GET /api/moderation/review-reports
 *
 * Moderator-only: list reports. Default status filter is "open" (new
 * reports the moderator has not yet seen). Pass ?status=reviewing or
 * other states to see history. Optional ?companyId and ?reason filters
 * help when working through a specific company / category.
 *
 * Response includes the review title + author role + company shortName
 * so the moderator can decide without a second round-trip.
 */
export async function GET(request: NextRequest) {
  let moderator
  try {
    moderator = await requireModerator()
  } catch (response) {
    if (response instanceof Response) return response
    throw response
  }

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get("status")
  const companyId = searchParams.get("companyId")
  const reason = searchParams.get("reason")
  const limit = Math.min(
    Number(searchParams.get("limit") ?? DEFAULT_LIMIT),
    MAX_LIMIT
  )
  const cursor = searchParams.get("cursor") ?? undefined

  const status: ReportStatus = ((): ReportStatus => {
    if (
      statusParam &&
      VALID_STATUSES.includes(statusParam as ReportStatus)
    ) {
      return statusParam as ReportStatus
    }
    return "open"
  })()

  try {
    const { db } = await import("@/db/client")

    const conditions: ReturnType<typeof and>[] = [
      eq(reviewReports.status, status),
    ]

    if (companyId) {
      conditions.push(eq(reviewReports.companyId, companyId))
    }
    if (reason) {
      conditions.push(eq(reviewReports.reason, reason as never))
    }
    if (cursor) {
      conditions.push(sql`${reviewReports.id} < ${cursor}`)
    }

    const rows = await db
      .select({
        id: reviewReports.id,
        reviewId: reviewReports.reviewId,
        companyId: reviewReports.companyId,
        reason: reviewReports.reason,
        note: reviewReports.note,
        status: reviewReports.status,
        createdAt: reviewReports.createdAt,
        actionedAt: reviewReports.actionedAt,
        actionTaken: reviewReports.actionTaken,
        moderationNote: reviewReports.moderationNote,
        moderatorUserId: reviewReports.moderatorUserId,
        reviewTitle: reviews.title,
        reviewContent: reviews.content,
        reviewAuthorRole: reviews.authorRole,
        reviewStatus: reviews.status,
        reviewAuthorLabel: reviews.authorLabel,
        companyShortName: companies.shortName,
      })
      .from(reviewReports)
      .innerJoin(reviews, eq(reviews.id, reviewReports.reviewId))
      .innerJoin(companies, eq(companies.id, reviewReports.companyId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reviewReports.createdAt), desc(reviewReports.id))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const slice = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? slice[slice.length - 1].id : null

    return NextResponse.json(
      {
        reports: slice.map((row) => ({
          id: row.id,
          reviewId: row.reviewId,
          companyId: row.companyId,
          companyShortName: row.companyShortName,
          reason: row.reason,
          note: row.note,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          actionedAt: row.actionedAt?.toISOString() ?? null,
          actionTaken: row.actionTaken,
          moderationNote: row.moderationNote,
          moderatorUserId: row.moderatorUserId,
          review: {
            title: row.reviewTitle,
            content: row.reviewContent,
            authorRole: row.reviewAuthorRole,
            authorLabel: row.reviewAuthorLabel,
            status: row.reviewStatus,
          },
        })),
        nextCursor,
        hasMore,
        moderator: { id: moderator.userId, role: moderator.role },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[review-reports] GET failed", error)
    return NextResponse.json(
      { error: "Internal error listing reports" },
      { status: 500 }
    )
  }
}

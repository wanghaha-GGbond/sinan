import { and, eq, inArray, isNull, max } from "drizzle-orm"

import { companyVerifications } from "@/db/schema/company-verifications"
import { reviewUsefulVotes } from "@/db/schema/review-useful-votes"
import { reviews } from "@/db/schema/reviews"

type PublicReviewRow = typeof reviews.$inferSelect

export type PublicReviewMetadata = {
  companyVerificationLevel: number
  isUsefulByCurrentUser: boolean
}

/**
 * Resolve public trust and viewer-specific vote state without exposing the
 * private account/anonymous-profile linkage in an API response.
 */
export async function getPublicReviewMetadata(
  rows: PublicReviewRow[],
  currentUserId?: string | null
): Promise<Map<string, PublicReviewMetadata>> {
  const result = new Map<string, PublicReviewMetadata>()
  for (const row of rows) {
    result.set(row.id, {
      companyVerificationLevel: 0,
      isUsefulByCurrentUser: false,
    })
  }
  if (rows.length === 0) return result

  const { db } = await import("@/db/client")
  const reviewIds = rows.map((row) => row.id)
  const authorUserIds = Array.from(
    new Set(rows.flatMap((row) => (row.authorUserId ? [row.authorUserId] : [])))
  )

  if (authorUserIds.length > 0) {
    const verificationRows = await db
      .select({
        companyId: companyVerifications.companyId,
        userId: companyVerifications.applicantUserId,
        level: max(companyVerifications.grantedTrustLevel),
      })
      .from(companyVerifications)
      .where(
        and(
          inArray(companyVerifications.applicantUserId, authorUserIds),
          inArray(
            companyVerifications.companyId,
            Array.from(new Set(rows.map((row) => row.companyId)))
          ),
          eq(companyVerifications.status, "approved")
        )
      )
      .groupBy(
        companyVerifications.companyId,
        companyVerifications.applicantUserId
      )

    const levelByCompanyUser = new Map(
      verificationRows.map((row) => [
        `${row.companyId}:${row.userId}`,
        Number(row.level ?? 0),
      ])
    )
    for (const row of rows) {
      if (!row.authorUserId) continue
      const metadata = result.get(row.id)
      if (metadata) {
        metadata.companyVerificationLevel =
          levelByCompanyUser.get(`${row.companyId}:${row.authorUserId}`) ?? 0
      }
    }
  }

  if (currentUserId) {
    const voteRows = await db
      .select({ reviewId: reviewUsefulVotes.reviewId })
      .from(reviewUsefulVotes)
      .where(
        and(
          inArray(reviewUsefulVotes.reviewId, reviewIds),
          eq(reviewUsefulVotes.userId, currentUserId),
          eq(reviewUsefulVotes.useful, true)
        )
      )

    for (const vote of voteRows) {
      const metadata = result.get(vote.reviewId)
      if (metadata) metadata.isUsefulByCurrentUser = true
    }
  }

  return result
}

export async function findPublicReview(
  reviewId: string,
  companyId?: string
): Promise<PublicReviewRow | null> {
  const { db } = await import("@/db/client")
  const conditions = [
    eq(reviews.id, reviewId),
    inArray(reviews.status, ["visible", "limited_visible"]),
    isNull(reviews.deletedAt),
  ]
  if (companyId) conditions.push(eq(reviews.companyId, companyId))

  const [row] = await db
    .select()
    .from(reviews)
    .where(and(...conditions))
    .limit(1)

  return row ?? null
}

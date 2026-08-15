import { and, count, eq, inArray, isNull } from "drizzle-orm"

import { reviewUsefulVotes } from "@/db/schema/review-useful-votes"
import { reviews } from "@/db/schema/reviews"

export type ReviewUsefulResult =
  | {
      kind: "updated"
      usefulCount: number
      isUsefulByCurrentUser: boolean
    }
  | { kind: "not_found" }

/**
 * Persist a review usefulness toggle and derive its count from the vote
 * ledger. Locking the review row serializes concurrent toggles for the same
 * review, preventing a stale recount from overwriting a newer total.
 */
export async function setReviewUseful(input: {
  reviewId: string
  userId: string
  useful: boolean
}): Promise<ReviewUsefulResult> {
  const { db } = await import("@/db/client")

  return db.transaction(async (tx) => {
    const [review] = await tx
      .select({
        id: reviews.id,
        usefulVoteBaseline: reviews.usefulVoteBaseline,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.id, input.reviewId),
          inArray(reviews.status, ["visible", "limited_visible"]),
          isNull(reviews.deletedAt)
        )
      )
      .for("update")
      .limit(1)

    if (!review) return { kind: "not_found" as const }

    await tx
      .insert(reviewUsefulVotes)
      .values({
        reviewId: input.reviewId,
        userId: input.userId,
        useful: input.useful,
      })
      .onConflictDoUpdate({
        target: [reviewUsefulVotes.reviewId, reviewUsefulVotes.userId],
        set: { useful: input.useful, updatedAt: new Date() },
      })

    const [{ activeVotes }] = await tx
      .select({ activeVotes: count() })
      .from(reviewUsefulVotes)
      .where(
        and(
          eq(reviewUsefulVotes.reviewId, input.reviewId),
          eq(reviewUsefulVotes.useful, true)
        )
      )

    const usefulCount =
      review.usefulVoteBaseline + Number(activeVotes ?? 0)

    await tx
      .update(reviews)
      .set({ usefulCount, updatedAt: new Date() })
      .where(eq(reviews.id, input.reviewId))

    return {
      kind: "updated" as const,
      usefulCount,
      isUsefulByCurrentUser: input.useful,
    }
  })
}

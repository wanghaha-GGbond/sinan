export const REVIEW_REJECTION_REASONS = [
  "sensitive_info",
  "personal_attack",
  "privacy",
  "spam",
  "off_topic",
  "duplicate",
] as const

export type ReviewRejectionReason = (typeof REVIEW_REJECTION_REASONS)[number]

export function reviewModerationTarget(action: string) {
  if (action === "approve") return "visible" as const
  if (action === "reject") return "rejected" as const
  return null
}

export function isReviewRejectionReason(value: string): value is ReviewRejectionReason {
  return REVIEW_REJECTION_REASONS.includes(value as ReviewRejectionReason)
}

export type ModerateReviewResult =
  | { kind: "updated"; review: { id: string; status: "visible" | "rejected" } }
  | { kind: "not_found" }
  | { kind: "conflict"; status: string }

export async function moderateReview(input: {
  reviewId: string
  moderator: { userId: string; role: string }
  action: "approve" | "reject"
  reason?: ReviewRejectionReason
}): Promise<ModerateReviewResult> {
  const { eq } = await import("drizzle-orm")
  const { moderationEvents } = await import("@/db/schema/moderation-events")
  const { reviews } = await import("@/db/schema/reviews")
  const { db } = await import("@/db/client")
  const targetStatus = input.action === "approve" ? "visible" : "rejected"

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ id: reviews.id, status: reviews.status })
      .from(reviews)
      .where(eq(reviews.id, input.reviewId))
      .for("update")
      .limit(1)

    if (!current) return { kind: "not_found" as const }
    if (current.status !== "pending_review") {
      return { kind: "conflict" as const, status: current.status }
    }

    const now = new Date()
    const [updated] = await tx
      .update(reviews)
      .set({
        status: targetStatus,
        moderationReason: input.action === "reject" ? input.reason : "none",
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(reviews.id, input.reviewId))
      .returning({ id: reviews.id, status: reviews.status })

    await tx.insert(moderationEvents).values({
      entityType: "review",
      entityId: input.reviewId,
      actorUserId: input.moderator.userId,
      actorRole: input.moderator.role,
      fromStatus: current.status,
      toStatus: targetStatus,
      reason: input.action === "reject" ? input.reason : null,
    })

    return {
      kind: "updated" as const,
      review: { id: updated.id, status: targetStatus },
    }
  })
}

import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { reviewDiscussions } from "@/db/schema/review-discussions"
import { discussionModerationEvents } from "@/db/schema/discussion-moderation-events"
import { requireModerator } from "@/lib/server/auth"

type ModerationReason =
  | "sensitive_info"
  | "personal_attack"
  | "privacy"
  | "spam"
  | "off_topic"
  | "duplicate"
  | "author_deleted"
  | "none"

const VALID_TARGET_STATUSES = [
  "visible",
  "limited_visible",
  "hidden",
  "rejected",
] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ discussionId: string }> }
) {
  const { discussionId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const targetStatus = String(body.status ?? "").trim()
  const reason = body.reason ? String(body.reason).trim() : undefined
  const note = body.note ? String(body.note).trim() : undefined
  const maskedContent = body.maskedContent
    ? String(body.maskedContent).trim()
    : undefined

  if (!VALID_TARGET_STATUSES.includes(targetStatus as (typeof VALID_TARGET_STATUSES)[number])) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_TARGET_STATUSES.join(", ")}` },
      { status: 400 }
    )
  }

  try {
    // Require moderator role
    let moderator
    try {
      moderator = await requireModerator()
    } catch (e) {
      if (e instanceof Response) return e
      throw e
    }

    const { db } = await import("@/db/client")

    const [discussion] = await db
      .select({
        id: reviewDiscussions.id,
        status: reviewDiscussions.status,
        content: reviewDiscussions.content,
        maskedContent: reviewDiscussions.maskedContent,
      })
      .from(reviewDiscussions)
      .where(
        and(eq(reviewDiscussions.id, discussionId), isNull(reviewDiscussions.deletedAt))
      )
      .limit(1)

    if (!discussion) {
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 })
    }

    const previousStatus = discussion.status
    const isPublic = targetStatus === "visible" || targetStatus === "limited_visible"

    // Update discussion status and visibility
    await db
      .update(reviewDiscussions)
      .set({
        status: targetStatus as typeof VALID_TARGET_STATUSES[number],
        moderationReason: reason as ModerationReason | undefined,
        maskedContent: maskedContent ?? undefined,
        reviewedAt: new Date(),
        visibleToPublic: isPublic,
        participatesInRanking: isPublic,
      })
      .where(eq(reviewDiscussions.id, discussionId))

    // Write moderation event
    await db.insert(discussionModerationEvents).values({
      discussionId,
      actorUserId: moderator.userId,
      actorRole: "moderator",
      fromStatus: previousStatus,
      toStatus: targetStatus,
      reason: reason ?? "manual_review",
      note: note ?? null,
      rawContentSnapshot: discussion.content,
      maskedContentSnapshot: maskedContent ?? discussion.maskedContent,
    })

    // Return updated discussion
    const [updated] = await db
      .select()
      .from(reviewDiscussions)
      .where(eq(reviewDiscussions.id, discussionId))
      .limit(1)

    if (!updated) {
      return NextResponse.json({ error: "Discussion not found after update" }, { status: 500 })
    }

    const { toPublicReviewDiscussionView } = await import(
      "@/lib/server/review-discussion-view"
    )

    return NextResponse.json({
      discussion: toPublicReviewDiscussionView(updated),
    })
  } catch (error) {
    if (error instanceof Response) throw error
    console.error("PATCH /api/moderation/review-discussions/:discussionId failed:", error)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }
}

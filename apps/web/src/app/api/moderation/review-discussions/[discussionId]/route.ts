import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { reviewDiscussions } from "@/db/schema/review-discussions"
import { discussionModerationEvents } from "@/db/schema/discussion-moderation-events"
import { requireModerator } from "@/lib/server/auth"

const VALID_TARGET_STATUSES = [
  "visible",
  "limited_visible",
  "hidden",
  "rejected",
] as const

type DiscussionStatus =
  | "draft"
  | "local_pending"
  | "pending_review"
  | "visible"
  | "limited_visible"
  | "hidden"
  | "rejected"
  | "deleted_by_author"

const ALLOWED_TRANSITIONS: Record<DiscussionStatus, readonly DiscussionStatus[]> = {
  draft: ["visible", "limited_visible", "rejected"],
  local_pending: ["visible", "limited_visible", "rejected"],
  pending_review: ["visible", "limited_visible", "rejected"],
  visible: ["limited_visible", "hidden", "rejected"],
  limited_visible: ["visible", "hidden", "rejected"],
  hidden: ["visible", "limited_visible", "rejected"],
  rejected: ["visible", "limited_visible"],
  deleted_by_author: [],
}

const VALID_REASONS = [
  "sensitive_info",
  "personal_attack",
  "privacy",
  "spam",
  "off_topic",
  "duplicate",
  "author_deleted",
  "none",
] as const

const moderationSchema = z.object({
  status: z.enum(VALID_TARGET_STATUSES),
  reason: z.enum(VALID_REASONS).default("none"),
  note: z.string().trim().max(500).optional(),
  maskedContent: z.string().trim().min(1).max(3000).optional(),
}).strict()

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ discussionId: string }> }
) {
  const { discussionId } = await params

  const contentLength = Number(request.headers.get("content-length") ?? "")
  if (Number.isFinite(contentLength) && contentLength > 16 * 1024) {
    return NextResponse.json({ error: "审核请求过大" }, { status: 413 })
  }

  let moderator
  try {
    moderator = await requireModerator(request)
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = moderationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "审核参数错误" },
      { status: 400 },
    )
  }
  const { status: targetStatus, reason, note, maskedContent } = parsed.data
  if (targetStatus === "limited_visible" && !maskedContent) {
    return NextResponse.json(
      { error: "limited_visible 必须提供脱敏内容" },
      { status: 400 },
    )
  }

  try {
    const { db } = await import("@/db/client")

    const result = await db.transaction(async (tx) => {
      const [discussion] = await tx
        .select({
          id: reviewDiscussions.id,
          status: reviewDiscussions.status,
          content: reviewDiscussions.content,
          maskedContent: reviewDiscussions.maskedContent,
        })
        .from(reviewDiscussions)
        .where(
          and(eq(reviewDiscussions.id, discussionId), isNull(reviewDiscussions.deletedAt)),
        )
        .for("update")
        .limit(1)

      if (!discussion) return { kind: "not_found" as const }

      const previousStatus = discussion.status as DiscussionStatus
      if (!ALLOWED_TRANSITIONS[previousStatus].includes(targetStatus)) {
        return { kind: "conflict" as const, status: previousStatus }
      }

      const now = new Date()
      const isPublic = targetStatus === "visible" || targetStatus === "limited_visible"
      const [updated] = await tx
        .update(reviewDiscussions)
        .set({
          status: targetStatus,
          moderationReason: reason,
          maskedContent: targetStatus === "limited_visible" ? maskedContent : null,
          reviewedAt: now,
          updatedAt: now,
          visibleToPublic: isPublic,
          participatesInRanking: isPublic,
        })
        .where(
          and(
            eq(reviewDiscussions.id, discussionId),
            eq(reviewDiscussions.status, previousStatus),
          ),
        )
        .returning()

      if (!updated) return { kind: "conflict" as const, status: previousStatus }

      await tx.insert(discussionModerationEvents).values({
        discussionId,
        actorUserId: moderator.userId,
        actorRole: "moderator",
        fromStatus: previousStatus,
        toStatus: targetStatus,
        reason,
        note: note ?? null,
        rawContentSnapshot: discussion.content,
        maskedContentSnapshot: updated.maskedContent,
      })

      return { kind: "updated" as const, updated }
    })

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 })
    }
    if (result.kind === "conflict") {
      return NextResponse.json(
        { error: "Discussion has already moved to another state", status: result.status },
        { status: 409 },
      )
    }

    const updated = result.updated

    const { toPublicReviewDiscussionView } = await import(
      "@/lib/server/review-discussion-view"
    )

    return NextResponse.json({
      discussion: toPublicReviewDiscussionView(updated),
    })
  } catch (error) {
    console.error("PATCH /api/moderation/review-discussions/:discussionId failed:", error)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }
}

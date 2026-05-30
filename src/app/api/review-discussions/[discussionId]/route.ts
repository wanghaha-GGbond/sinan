import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { reviewDiscussions } from "@/db/schema/review-discussions"
import { discussionModerationEvents } from "@/db/schema/discussion-moderation-events"
import { requireAuthUser } from "@/lib/server/auth"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ discussionId: string }> }
) {
  const { discussionId } = await params

  try {
    // Require authentication
    let authUser
    try {
      authUser = await requireAuthUser()
    } catch (e) {
      if (e instanceof Response) return e
      throw e
    }

    const { db } = await import("@/db/client")

    const [discussion] = await db
      .select({
        id: reviewDiscussions.id,
        status: reviewDiscussions.status,
        authorUserId: reviewDiscussions.authorUserId,
        content: reviewDiscussions.content,
      })
      .from(reviewDiscussions)
      .where(
        and(eq(reviewDiscussions.id, discussionId), isNull(reviewDiscussions.deletedAt))
      )
      .limit(1)

    if (!discussion) {
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 })
    }

    // Verify caller is the author
    if (discussion.authorUserId !== authUser.userId) {
      return NextResponse.json(
        { error: "Only the author can delete their discussion" },
        { status: 403 }
      )
    }

    const previousStatus = discussion.status
    const now = new Date()

    // Soft delete the discussion
    await db
      .update(reviewDiscussions)
      .set({
        status: "deleted_by_author",
        deletedAt: now,
        visibleToPublic: false,
        participatesInRanking: false,
      })
      .where(eq(reviewDiscussions.id, discussionId))

    // Write moderation event
    await db.insert(discussionModerationEvents).values({
      discussionId,
      actorUserId: authUser.userId,
      actorRole: "author",
      fromStatus: previousStatus,
      toStatus: "deleted_by_author",
      reason: "author_deleted",
      rawContentSnapshot: discussion.content,
    })

    return NextResponse.json({
      discussion: {
        id: discussionId,
        status: "deleted_by_author",
        deletedAt: now.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof Response) throw error
    console.error("DELETE /api/review-discussions/:discussionId failed:", error)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }
}

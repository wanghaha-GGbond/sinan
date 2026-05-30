import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull, count } from "drizzle-orm"
import { reviewDiscussions } from "@/db/schema/review-discussions"
import { discussionUsefulVotes } from "@/db/schema/discussion-useful-votes"
import { getAuthUser } from "@/lib/server/auth"

export async function POST(
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

  const useful = Boolean(body.useful)

  try {
    const { db } = await import("@/db/client")

    // Verify discussion exists and is public
    const [discussion] = await db
      .select({
        id: reviewDiscussions.id,
        status: reviewDiscussions.status,
        usefulCount: reviewDiscussions.usefulCount,
      })
      .from(reviewDiscussions)
      .where(
        and(eq(reviewDiscussions.id, discussionId), isNull(reviewDiscussions.deletedAt))
      )
      .limit(1)

    if (!discussion) {
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 })
    }

    if (!["visible", "limited_visible"].includes(discussion.status)) {
      return NextResponse.json(
        { error: "Only public discussions can be voted useful" },
        { status: 403 }
      )
    }

    // Require voter identity
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { error: "Voter identity is required" },
        { status: 401 }
      )
    }

    if (useful) {
      // Check for any existing vote (active or soft-deleted)
      const [existing] = await db
        .select({
          id: discussionUsefulVotes.id,
          deletedAt: discussionUsefulVotes.deletedAt,
        })
        .from(discussionUsefulVotes)
        .where(
          and(
            eq(discussionUsefulVotes.discussionId, discussionId),
            eq(discussionUsefulVotes.userId, authUser.userId)
          )
        )
        .limit(1)

      if (existing) {
        if (existing.deletedAt !== null) {
          // Reactivate soft-deleted vote
          await db
            .update(discussionUsefulVotes)
            .set({ deletedAt: null, useful: true, updatedAt: new Date() })
            .where(eq(discussionUsefulVotes.id, existing.id))
        }
        // If already active, idempotent — still re-count below
      } else {
        // Insert new vote. onConflictDoNothing handles concurrent inserts
        // where another request already created a row between our SELECT and INSERT.
        await db
          .insert(discussionUsefulVotes)
          .values({
            discussionId,
            userId: authUser.userId,
            useful: true,
          })
          .onConflictDoNothing()
      }

      // Re-count from DB after mutation — avoids race conditions on
      // increment-based counting (two concurrent +1 would lose a count).
      const [{ cnt }] = await db
        .select({ cnt: count() })
        .from(discussionUsefulVotes)
        .where(
          and(
            eq(discussionUsefulVotes.discussionId, discussionId),
            eq(discussionUsefulVotes.useful, true),
            isNull(discussionUsefulVotes.deletedAt)
          )
        )

      const newCount = Number(cnt ?? 0)
      await db
        .update(reviewDiscussions)
        .set({ usefulCount: newCount })
        .where(eq(reviewDiscussions.id, discussionId))

      return NextResponse.json({
        usefulCount: newCount,
        isUsefulByCurrentUser: true,
      })
    } else {
      // Remove vote (soft delete)
      const [existingVote] = await db
        .select({ id: discussionUsefulVotes.id })
        .from(discussionUsefulVotes)
        .where(
          and(
            eq(discussionUsefulVotes.discussionId, discussionId),
            eq(discussionUsefulVotes.userId, authUser.userId),
            isNull(discussionUsefulVotes.deletedAt)
          )
        )
        .limit(1)

      if (existingVote) {
        await db
          .update(discussionUsefulVotes)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(discussionUsefulVotes.id, existingVote.id))

        // Re-count for consistency
        const [{ cnt }] = await db
          .select({ cnt: count() })
          .from(discussionUsefulVotes)
          .where(
            and(
              eq(discussionUsefulVotes.discussionId, discussionId),
              eq(discussionUsefulVotes.useful, true),
              isNull(discussionUsefulVotes.deletedAt)
            )
          )

        const newCount = Number(cnt ?? 0)
        await db
          .update(reviewDiscussions)
          .set({ usefulCount: newCount })
          .where(eq(reviewDiscussions.id, discussionId))

        return NextResponse.json({
          usefulCount: newCount,
          isUsefulByCurrentUser: false,
        })
      }

      // No vote to remove — idempotent
      return NextResponse.json({
        usefulCount: discussion.usefulCount,
        isUsefulByCurrentUser: false,
      })
    }
  } catch (error) {
    console.error("POST /api/review-discussions/:discussionId/useful failed:", error)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }
}

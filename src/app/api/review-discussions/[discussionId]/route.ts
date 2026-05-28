import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { reviewDiscussions } from "@/db/schema/review-discussions"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ discussionId: string }> }
) {
  const { discussionId } = await params

  try {
    const { db } = await import("@/db/client")

    // Verify discussion exists
    const [discussion] = await db
      .select({
        id: reviewDiscussions.id,
        status: reviewDiscussions.status,
      })
      .from(reviewDiscussions)
      .where(
        and(eq(reviewDiscussions.id, discussionId), isNull(reviewDiscussions.deletedAt))
      )
      .limit(1)

    if (!discussion) {
      return NextResponse.json(
        { error: "Discussion not found" },
        { status: 404 }
      )
    }

    // Author identity is required
    // Currently no auth — return 401 until auth is in place
    return NextResponse.json(
      { error: "Author identity is required" },
      { status: 401 }
    )

    // Future implementation (when auth exists):
    // 1. Verify caller is the discussion author (match authorUserId or anonymousProfileId)
    // 2. Update discussion: status=deleted_by_author, deletedAt=now()
    // 3. Insert moderation event: actorRole=author, reason=author_deleted,
    //    fromStatus=current, toStatus=deleted_by_author
    // 4. Return { discussion: { id, status: "deleted_by_author", deletedAt } }
  } catch (error) {
    console.error(
      "DELETE /api/review-discussions/:discussionId failed:",
      error
    )
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { reviewDiscussions } from "@/db/schema/review-discussions"

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

  // reason, note, maskedContent are parsed now; used when moderator auth exists
  void body.reason
  void body.note
  void body.maskedContent

  if (!VALID_TARGET_STATUSES.includes(targetStatus as (typeof VALID_TARGET_STATUSES)[number])) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_TARGET_STATUSES.join(", ")}` },
      { status: 400 }
    )
  }

  try {
    const { db } = await import("@/db/client")

    // Verify discussion exists
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
      return NextResponse.json(
        { error: "Discussion not found" },
        { status: 404 }
      )
    }

    // Moderator identity is required
    // Currently no auth — return 401 until moderator auth is in place
    return NextResponse.json(
      { error: "Moderator identity is required" },
      { status: 401 }
    )

    // Future implementation (when moderator auth exists):
    // 1. Verify caller has moderator/admin role
    // 2. Update discussion: status, moderationReason, maskedContent, reviewedAt,
    //    visibleToPublic, participatesInRanking
    // 3. Insert moderation event with actorRole=moderator
    // 4. Return updated discussion
  } catch (error) {
    console.error(
      "PATCH /api/moderation/review-discussions/:discussionId failed:",
      error
    )
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}

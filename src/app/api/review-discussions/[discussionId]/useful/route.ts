import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull } from "drizzle-orm"
import { reviewDiscussions } from "@/db/schema/review-discussions"

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

  // useful will be used when voter identity is available
  void body.useful

  try {
    const { db } = await import("@/db/client")

    // Verify discussion exists and is public
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

    if (!["visible", "limited_visible"].includes(discussion.status)) {
      return NextResponse.json(
        { error: "Only public discussions can be voted useful" },
        { status: 403 }
      )
    }

    // Voter identity is required for real API dedup
    // Currently no auth, so we cannot identify the voter
    // Return 401 rather than allowing unauthenticated voting
    return NextResponse.json(
      { error: "Voter identity is required" },
      { status: 401 }
    )

    // Future implementation (when auth exists):
    // 1. Upsert vote into discussion_useful_votes using ON CONFLICT
    // 2. Update discussion usefulCount accordingly
    // 3. Return { usefulCount, isUsefulByCurrentUser }
  } catch (error) {
    console.error("POST /api/review-discussions/:discussionId/useful failed:", error)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}

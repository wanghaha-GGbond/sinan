import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull, inArray, desc, sql } from "drizzle-orm"
import { reviews } from "@/db/schema/reviews"
import { reviewDiscussions } from "@/db/schema/review-discussions"
import { toPublicReviewDiscussionView } from "@/lib/server/review-discussion-view"

const phonePattern = /1[3-9]\d{9}/
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const idCardPattern = /\d{17}[\dXx]/
const attackWords = [
  "垃圾", "傻逼", "黑心", "压榨", "坑人", "骗子",
  "狗公司", "曝光", "挂人", "爆雷",
]

function hasSensitive(value: string) {
  return phonePattern.test(value) || emailPattern.test(value) || idCardPattern.test(value)
}

function hasAttackWord(value: string) {
  return attackWords.some((word) => value.includes(word))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params
  const { searchParams } = new URL(request.url)
  const sort = searchParams.get("sort") ?? "useful"
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50)
  const cursor = searchParams.get("cursor") ?? undefined

  try {
    const { db } = await import("@/db/client")

    // Verify review exists and is public
    const [review] = await db
      .select({
        id: reviews.id,
        status: reviews.status,
      })
      .from(reviews)
      .where(and(eq(reviews.id, reviewId), isNull(reviews.deletedAt)))
      .limit(1)

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    if (!["visible", "limited_visible"].includes(review.status)) {
      return NextResponse.json(
        { error: "Review is not public" },
        { status: 403 }
      )
    }

    // Build query conditions
    const conditions: ReturnType<typeof and>[] = [
      eq(reviewDiscussions.reviewId, reviewId),
      inArray(reviewDiscussions.status, ["visible", "limited_visible"]),
      isNull(reviewDiscussions.deletedAt),
    ]

    if (cursor) {
      conditions.push(sql`${reviewDiscussions.id} < ${cursor}`)
    }

    const orderBy =
      sort === "latest"
        ? [desc(reviewDiscussions.createdAt), desc(reviewDiscussions.id)]
        : [desc(reviewDiscussions.usefulCount), desc(reviewDiscussions.createdAt)]

    const rows = await db
      .select()
      .from(reviewDiscussions)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const resultRows = hasMore ? rows.slice(0, limit) : rows

    return NextResponse.json({
      publicDiscussions: resultRows.map(toPublicReviewDiscussionView),
      myDiscussions: [],
      nextCursor: hasMore ? resultRows[resultRows.length - 1].id : null,
    })
  } catch (error) {
    console.error("GET /api/reviews/:reviewId/discussions failed:", error)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const companyId = String(body.companyId ?? "").trim()
  const type = String(body.type ?? "").trim()
  const content = String(body.content ?? "").trim()
  const tags: string[] | undefined = Array.isArray(body.tags)
    ? (body.tags as string[])
    : undefined

  // Validate required fields
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 })
  }

  if (type !== "question" && type !== "supplement") {
    return NextResponse.json(
      { error: "type must be 'question' or 'supplement'" },
      { status: 400 }
    )
  }

  // Content validation (aligns with content-guard)
  if (content.length < 5) {
    return NextResponse.json(
      { error: "Content must be at least 5 characters" },
      { status: 400 }
    )
  }

  if (content.length > 300) {
    return NextResponse.json(
      { error: "Content must be at most 300 characters" },
      { status: 400 }
    )
  }

  if (hasSensitive(content) || hasAttackWord(content)) {
    return NextResponse.json(
      { error: "Content contains inappropriate information" },
      { status: 400 }
    )
  }

  try {
    const { db } = await import("@/db/client")

    // Verify review exists, is public, and companyId matches
    const [review] = await db
      .select({
        id: reviews.id,
        status: reviews.status,
        companyId: reviews.companyId,
      })
      .from(reviews)
      .where(and(eq(reviews.id, reviewId), isNull(reviews.deletedAt)))
      .limit(1)

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    if (!["visible", "limited_visible"].includes(review.status)) {
      return NextResponse.json(
        { error: "Review is not public" },
        { status: 403 }
      )
    }

    if (review.companyId !== companyId) {
      return NextResponse.json(
        { error: "companyId does not match review" },
        { status: 400 }
      )
    }

    const [row] = await db
      .insert(reviewDiscussions)
      .values({
        reviewId,
        companyId,
        type: type as "question" | "supplement",
        authorRole: "anonymous",
        authorLabel: "匿名评价者",
        content,
        tags,
        status: "pending_review",
        source: "api",
        visibleToAuthor: true,
        visibleToPublic: false,
        participatesInRanking: false,
      })
      .returning()

    return NextResponse.json(
      {
        discussion: toPublicReviewDiscussionView(row),
        message: "内容已提交，等待审核",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/reviews/:reviewId/discussions failed:", error)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}

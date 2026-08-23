import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull, inArray, desc, lt, or } from "drizzle-orm"
import { z } from "zod"
import { reviews } from "@/db/schema/reviews"
import { reviewDiscussions } from "@/db/schema/review-discussions"
import { toPublicReviewDiscussionView } from "@/lib/server/review-discussion-view"
import { getAuthUserFromRequest, requireAuthUser } from "@/lib/server/auth"
import { getOrCreateAnonymousProfile } from "@/lib/server/anonymous-profile"
import { hasSensitive, hasAttackWord } from "@/lib/content-guard"
import { getRateLimitKey } from "@/lib/server/rate-limit"
import { checkPersistentRateLimit } from "@/lib/server/persistent-rate-limit"

type DiscussionSortKey = "useful" | "latest"

const discussionSubmissionSchema = z.object({
  companyId: z.string().trim().min(1).max(120),
  type: z.enum(["question", "supplement"]),
  content: z.string().trim().min(5).max(300),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
}).strict()

function encodeDiscussionCursor(
  sort: DiscussionSortKey,
  usefulCount: number,
  createdAt: Date,
  id: string
): string {
  // Same pattern as the reviews cursor: encode the full sort
  // tuple + tiebreaker so the row-comparison has the data it
  // needs to land on the next page without skipping or
  // duplicating rows.
  const payload = sort === "latest"
    ? `${createdAt.getTime()}|${id}`
    : `${usefulCount}|${createdAt.getTime()}|${id}`
  return Buffer.from(payload, "utf8").toString("base64url")
}

function decodeDiscussionCursor(
  sort: DiscussionSortKey,
  raw: string
): { usefulCount: number; createdAt: Date; id: string } | null {
  try {
    const payload = Buffer.from(raw, "base64url").toString("utf8")
    if (sort === "latest") {
      const [ts, id] = payload.split("|")
      if (!ts || !id || Number.isNaN(Number(ts))) return null
      return { usefulCount: 0, createdAt: new Date(Number(ts)), id }
    }
    const [uc, ts, id] = payload.split("|")
    if (!uc || !ts || !id || Number.isNaN(Number(uc)) || Number.isNaN(Number(ts))) {
      return null
    }
    return { usefulCount: Number(uc), createdAt: new Date(Number(ts)), id }
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params
  const { searchParams } = new URL(request.url)
  const sort = (searchParams.get("sort") ?? "useful") as DiscussionSortKey
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50)
  const rawCursor = searchParams.get("cursor") ?? null

  if (sort !== "useful" && sort !== "latest") {
    return NextResponse.json({ error: "Invalid discussion sort" }, { status: 400 })
  }
  if (!Number.isFinite(limit) || limit < 1) {
    return NextResponse.json({ error: "limit must be between 1 and 50" }, { status: 400 })
  }

  try {
    const { db } = await import("@/db/client")

    const [review] = await db
      .select({ id: reviews.id, status: reviews.status })
      .from(reviews)
      .where(and(eq(reviews.id, reviewId), isNull(reviews.deletedAt)))
      .limit(1)

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    if (!["visible", "limited_visible"].includes(review.status)) {
      return NextResponse.json({ error: "Review is not public" }, { status: 403 })
    }

    // Public discussions
    const conditions: ReturnType<typeof and>[] = [
      eq(reviewDiscussions.reviewId, reviewId),
      inArray(reviewDiscussions.status, ["visible", "limited_visible"]),
      isNull(reviewDiscussions.deletedAt),
    ]

    // Cursor-based pagination: same row-comparison pattern
    // as the reviews endpoint — encode the full sort tuple
    // so 'useful' sort with tied counts doesn't skip or
    // duplicate rows.
    const decoded = rawCursor ? decodeDiscussionCursor(sort, rawCursor) : null
    if (decoded) {
      if (sort === "latest") {
        conditions.push(
          or(
            lt(reviewDiscussions.createdAt, decoded.createdAt),
            and(
              eq(reviewDiscussions.createdAt, decoded.createdAt),
              lt(reviewDiscussions.id, decoded.id)
            )
          )!
        )
      } else {
        conditions.push(
          or(
            lt(reviewDiscussions.usefulCount, decoded.usefulCount),
            and(
              eq(reviewDiscussions.usefulCount, decoded.usefulCount),
              lt(reviewDiscussions.createdAt, decoded.createdAt)
            ),
            and(
              eq(reviewDiscussions.usefulCount, decoded.usefulCount),
              eq(reviewDiscussions.createdAt, decoded.createdAt),
              lt(reviewDiscussions.id, decoded.id)
            )
          )!
        )
      }
    }

    // Add `id desc` as a final tiebreaker in both sort modes
    // — the old `useful` order had no tiebreaker, so two
    // rows with the same usefulCount and createdAt would
    // page non-deterministically.
    const orderBy =
      sort === "latest"
        ? [desc(reviewDiscussions.createdAt), desc(reviewDiscussions.id)]
        : [
            desc(reviewDiscussions.usefulCount),
            desc(reviewDiscussions.createdAt),
            desc(reviewDiscussions.id),
          ]

    const rows = await db
      .select()
      .from(reviewDiscussions)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const resultRows = hasMore ? rows.slice(0, limit) : rows
    const last = resultRows[resultRows.length - 1]

    // My discussions (if authenticated)
    const authUser = await getAuthUserFromRequest(request)
    let myDiscussions: typeof rows = []

    if (authUser) {
      const myConditions: ReturnType<typeof and>[] = [
        eq(reviewDiscussions.reviewId, reviewId),
        isNull(reviewDiscussions.deletedAt),
      ]

      if (authUser.userId) {
        myConditions.push(eq(reviewDiscussions.authorUserId, authUser.userId))
      }

      const nonPublicStatuses: Array<
        "pending_review" | "hidden" | "rejected" | "deleted_by_author"
      > = ["pending_review", "hidden", "rejected", "deleted_by_author"]

      const myRows = await db
        .select()
        .from(reviewDiscussions)
        .where(
          and(
            ...myConditions,
            inArray(reviewDiscussions.status, nonPublicStatuses)
          )
        )
        .orderBy(desc(reviewDiscussions.createdAt), desc(reviewDiscussions.id))
        .limit(20)

      myDiscussions = myRows
    }

    return NextResponse.json({
      publicDiscussions: resultRows.map(toPublicReviewDiscussionView),
      myDiscussions: myDiscussions.map(toPublicReviewDiscussionView),
      nextCursor:
        hasMore && last
          ? encodeDiscussionCursor(sort, last.usefulCount, last.createdAt, last.id)
          : null,
    })
  } catch (error) {
    console.error("GET /api/reviews/:reviewId/discussions failed:", error)
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params

  let authUser
  try {
    // Discussions are user-generated content and must have an accountable
    // owner. Anonymous display labels are still preserved via the profile.
    authUser = await requireAuthUser(request)
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }

  const rateLimit = await checkPersistentRateLimit(
    `review-discussion-submit:user:${authUser.userId}:${getRateLimitKey(request, "/api/reviews/:reviewId/discussions")}`,
    { maxRequests: 10, windowSeconds: 60 * 60 },
  )
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "补充内容提交过于频繁，请稍后再试", retryAfter: rateLimit.retryAfter },
      { status: 429 },
    )
  }

  const contentLength = Number(request.headers.get("content-length") ?? "")
  if (Number.isFinite(contentLength) && contentLength > 32 * 1024) {
    return NextResponse.json({ error: "补充内容请求过大" }, { status: 413 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = discussionSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "补充内容参数不正确" },
      { status: 400 },
    )
  }
  const { companyId, type, content, tags } = parsed.data

  if (hasSensitive(content) || hasAttackWord(content)) {
    return NextResponse.json(
      { error: "Content contains inappropriate information" },
      { status: 400 }
    )
  }

  try {
    const { db } = await import("@/db/client")

    const [review] = await db
      .select({ id: reviews.id, status: reviews.status, companyId: reviews.companyId })
      .from(reviews)
      .where(and(eq(reviews.id, reviewId), isNull(reviews.deletedAt)))
      .limit(1)

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    if (!["visible", "limited_visible"].includes(review.status)) {
      return NextResponse.json({ error: "Review is not public" }, { status: 403 })
    }

    if (review.companyId !== companyId) {
      return NextResponse.json({ error: "companyId does not match review" }, { status: 400 })
    }

    // Extract auth user + anonymous profile
    let anonProfile = null
    try {
      anonProfile = await getOrCreateAnonymousProfile({
        userId: authUser.userId,
        scope: { scopeType: "company", scopeId: companyId },
      })
    } catch {
      // The database-backed user link remains valid even if the optional
      // anonymous profile cannot be refreshed.
    }

    const [row] = await db
      .insert(reviewDiscussions)
      .values({
        reviewId,
        companyId,
        type: type as "question" | "supplement",
        authorUserId: authUser.userId,
        anonymousProfileId: anonProfile?.id ?? null,
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
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }
}

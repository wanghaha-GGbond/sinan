import { and, eq, inArray, isNull } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

import { reviewAuthorBlocks } from "@/db/schema/review-author-blocks"
import { reviews } from "@/db/schema/reviews"
import { requireAuthUser } from "@/lib/server/auth"

type ReviewAuthorTarget = {
  userId: string | null
  anonymousProfileId: string | null
  fingerprintHash: string | null
}

function targetFromReview(review: {
  authorUserId: string | null
  anonymousProfileId: string | null
  authorFingerprintHash: string | null
}): ReviewAuthorTarget | null {
  if (review.authorUserId) {
    return { userId: review.authorUserId, anonymousProfileId: null, fingerprintHash: null }
  }
  if (review.anonymousProfileId) {
    return { userId: null, anonymousProfileId: review.anonymousProfileId, fingerprintHash: null }
  }
  if (review.authorFingerprintHash) {
    return { userId: null, anonymousProfileId: null, fingerprintHash: review.authorFingerprintHash }
  }
  return null
}

async function loadReviewTarget(reviewId: string) {
  const { db } = await import("@/db/client")
  const [review] = await db
    .select({
      id: reviews.id,
      authorUserId: reviews.authorUserId,
      anonymousProfileId: reviews.anonymousProfileId,
      authorFingerprintHash: reviews.authorFingerprintHash,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.id, reviewId),
        inArray(reviews.status, ["visible", "limited_visible"]),
        isNull(reviews.deletedAt),
      ),
    )
    .limit(1)

  if (!review) return { db, review: null, target: null }
  return { db, review, target: targetFromReview(review) }
}

function targetValues(target: ReviewAuthorTarget) {
  return {
    blockedAuthorUserId: target.userId,
    blockedAnonymousProfileId: target.anonymousProfileId,
    blockedAuthorFingerprintHash: target.fingerprintHash,
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const { reviewId } = await params
  let authUser
  try {
    authUser = await requireAuthUser(request)
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }

  try {
    const { db, review, target } = await loadReviewTarget(reviewId)
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 })
    if (!target) {
      return NextResponse.json(
        { error: "This review does not have a blockable author identity" },
        { status: 409 },
      )
    }

    const values = targetValues(target)
    const [row] = await db
      .insert(reviewAuthorBlocks)
      .values({ blockerUserId: authUser.userId, ...values })
      .onConflictDoNothing()
      .returning({ id: reviewAuthorBlocks.id })

    return NextResponse.json({
      blocked: true,
      created: Boolean(row),
      blockId: row?.id ?? null,
    }, { status: row ? 201 : 200 })
  } catch (error) {
    console.error("POST /api/reviews/:reviewId/block-author failed:", error)
    return NextResponse.json({ error: "Author block unavailable" }, { status: 503 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const { reviewId } = await params
  let authUser
  try {
    authUser = await requireAuthUser(request)
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }

  try {
    const { db, review, target } = await loadReviewTarget(reviewId)
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 })
    if (!target) return NextResponse.json({ blocked: false, removed: false })

    const values = targetValues(target)
    const conditions = [eq(reviewAuthorBlocks.blockerUserId, authUser.userId)]
    if (values.blockedAuthorUserId) conditions.push(eq(reviewAuthorBlocks.blockedAuthorUserId, values.blockedAuthorUserId))
    if (values.blockedAnonymousProfileId) conditions.push(eq(reviewAuthorBlocks.blockedAnonymousProfileId, values.blockedAnonymousProfileId))
    if (values.blockedAuthorFingerprintHash) conditions.push(eq(reviewAuthorBlocks.blockedAuthorFingerprintHash, values.blockedAuthorFingerprintHash))

    const deleted = await db
      .delete(reviewAuthorBlocks)
      .where(and(...conditions))
      .returning({ id: reviewAuthorBlocks.id })

    return NextResponse.json({ blocked: false, removed: deleted.length > 0 })
  } catch (error) {
    console.error("DELETE /api/reviews/:reviewId/block-author failed:", error)
    return NextResponse.json({ error: "Author unblock unavailable" }, { status: 503 })
  }
}

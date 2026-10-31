import { NextRequest, NextResponse } from "next/server"

import { getAuthUserFromRequest } from "@/lib/server/auth"
import {
  findPublicReview,
  getBlockedReviewAuthorKeys,
  getPublicReviewMetadata,
  isReviewAuthorBlocked,
} from "@/lib/server/public-review-query"
import { toPublicReviewView } from "@/lib/server/review-view"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params

  try {
    const review = await findPublicReview(reviewId)
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    const authUser = await getAuthUserFromRequest(request)
    const blockedAuthors = await getBlockedReviewAuthorKeys(authUser?.userId)
    if (isReviewAuthorBlocked(review, blockedAuthors)) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }
    const metadata = await getPublicReviewMetadata(
      [review],
      authUser?.userId
    )

    return NextResponse.json({
      review: toPublicReviewView(review, metadata.get(review.id)),
    })
  } catch (error) {
    console.error("GET /api/reviews/:reviewId failed:", error)
    return NextResponse.json({ error: "Review unavailable" }, { status: 503 })
  }
}

import { NextRequest, NextResponse } from "next/server"

import { requireModerator } from "@/lib/server/auth"
import {
  isReviewRejectionReason,
  moderateReview,
  reviewModerationTarget,
} from "@/lib/server/review-moderation"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
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

  const action = String(body.action ?? "")
  const targetStatus = reviewModerationTarget(action)
  const reason = String(body.reason ?? "")
  if (!targetStatus) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 })
  }
  const moderatedAction: "approve" | "reject" = action === "approve" ? "approve" : "reject"
  if (action === "reject" && !isReviewRejectionReason(reason)) {
    return NextResponse.json({ error: "A valid rejection reason is required" }, { status: 400 })
  }

  const { reviewId } = await params

  try {
    const result = await moderateReview({
      reviewId,
      moderator,
      action: moderatedAction,
      reason: moderatedAction === "reject" && isReviewRejectionReason(reason) ? reason : undefined,
    })

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }
    if (result.kind === "conflict") {
      return NextResponse.json(
        { error: "Review has already been moderated", status: result.status },
        { status: 409 }
      )
    }
    return NextResponse.json(result.review)
  } catch (error) {
    console.error("PATCH /api/moderation/reviews/:reviewId failed:", error)
    return NextResponse.json({ error: "Unable to moderate review" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { setReviewUseful } from "@/lib/server/review-useful"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params

  let authUser
  try {
    authUser = await requireAuthUser(request)
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { useful?: unknown }).useful !== "boolean"
  ) {
    return NextResponse.json(
      { error: "useful must be a boolean" },
      { status: 400 }
    )
  }

  try {
    const result = await setReviewUseful({
      reviewId,
      userId: authUser.userId,
      useful: (body as { useful: boolean }).useful,
    })
    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error("POST /api/reviews/:reviewId/useful failed:", error)
    return NextResponse.json({ error: "Vote unavailable" }, { status: 503 })
  }
}

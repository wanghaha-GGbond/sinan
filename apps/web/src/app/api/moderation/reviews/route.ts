import { and, asc, eq, isNull } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

import { companies } from "@/db/schema/companies"
import { reviews } from "@/db/schema/reviews"
import { requireModerator } from "@/lib/server/auth"

export async function GET(request: NextRequest) {
  try {
    await requireModerator(request)
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }

  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 30)
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100)
    : 30

  try {
    const { db } = await import("@/db/client")
    const rows = await db
      .select({
        id: reviews.id,
        companyId: reviews.companyId,
        companyName: companies.name,
        title: reviews.title,
        content: reviews.content,
        authorRole: reviews.authorRole,
        directionScore: reviews.directionScore,
        recommendToJoin: reviews.recommendToJoin,
        ratingDimensions: reviews.ratingDimensions,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .innerJoin(companies, eq(companies.id, reviews.companyId))
      .where(and(eq(reviews.status, "pending_review"), isNull(reviews.deletedAt)))
      .orderBy(asc(reviews.createdAt))
      .limit(limit)

    return NextResponse.json({
      reviews: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    })
  } catch (error) {
    console.error("GET /api/moderation/reviews failed:", error)
    return NextResponse.json({ error: "Unable to load review queue" }, { status: 500 })
  }
}

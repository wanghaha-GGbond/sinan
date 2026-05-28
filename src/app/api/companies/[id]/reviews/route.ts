import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull, inArray, desc, sql } from "drizzle-orm"
import { companies } from "@/db/schema/companies"
import { reviews } from "@/db/schema/reviews"
import { toPublicReviewView } from "@/lib/server/review-view"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const { searchParams } = new URL(request.url)
  const sort = searchParams.get("sort") ?? "useful"
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50)
  const cursor = searchParams.get("cursor") ?? undefined

  try {
    const { db } = await import("@/db/client")

    // Verify company exists and is reviewable
    const [company] = await db
      .select({
        id: companies.id,
        reviewStatus: companies.reviewStatus,
      })
      .from(companies)
      .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
      .limit(1)

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    if (company.reviewStatus !== "reviewable") {
      return NextResponse.json(
        { error: "Company is not reviewable" },
        { status: 403 }
      )
    }

    // Build query conditions
    const conditions: ReturnType<typeof and>[] = [
      eq(reviews.companyId, companyId),
      inArray(reviews.status, ["visible", "limited_visible"]),
      isNull(reviews.deletedAt),
    ]

    // Cursor-based pagination
    if (cursor) {
      conditions.push(sql`${reviews.id} < ${cursor}`)
    }

    // Determine ordering
    const orderBy =
      sort === "latest"
        ? [desc(reviews.createdAt), desc(reviews.id)]
        : [desc(reviews.usefulCount), desc(reviews.createdAt)]

    const rows = await db
      .select()
      .from(reviews)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const resultRows = hasMore ? rows.slice(0, limit) : rows

    return NextResponse.json({
      reviews: resultRows.map(toPublicReviewView),
      nextCursor: hasMore ? resultRows[resultRows.length - 1].id : null,
    })
  } catch (error) {
    console.error("GET /api/companies/:id/reviews failed:", error)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull, inArray, desc, lt, or } from "drizzle-orm"
import { companies } from "@/db/schema/companies"
import { reviews } from "@/db/schema/reviews"
import { toPublicReviewView } from "@/lib/server/review-view"

type SortKey = "latest" | "useful"

function encodeCursor(sort: SortKey, usefulCount: number, createdAt: Date, id: string): string {
  // Cursor encodes the full sort tuple + tiebreaker. For
  // 'latest' it's createdAt + id; for 'useful' it's
  // usefulCount + createdAt + id (the extra key is the
  // tiebreaker for the usefulCount column). We base64url it
  // so the cursor is opaque to clients (and they can't
  // accidentally request a different sort with the same id).
  const payload = sort === "latest"
    ? `${createdAt.getTime()}|${id}`
    : `${usefulCount}|${createdAt.getTime()}|${id}`
  return Buffer.from(payload, "utf8").toString("base64url")
}

function decodeCursor(sort: SortKey, raw: string): { usefulCount: number; createdAt: Date; id: string } | null {
  try {
    const payload = Buffer.from(raw, "base64url").toString("utf8")
    if (sort === "latest") {
      const [ts, id] = payload.split("|")
      if (!ts || !id || Number.isNaN(Number(ts))) return null
      return { usefulCount: 0, createdAt: new Date(Number(ts)), id }
    } else {
      const [uc, ts, id] = payload.split("|")
      if (!uc || !ts || !id || Number.isNaN(Number(uc)) || Number.isNaN(Number(ts))) return null
      return { usefulCount: Number(uc), createdAt: new Date(Number(ts)), id }
    }
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const { searchParams } = new URL(request.url)
  const sort = (searchParams.get("sort") ?? "useful") as SortKey
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50)
  const rawCursor = searchParams.get("cursor") ?? null

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

    // Cursor-based pagination: row-comparison on the same
    // (sortCol, createdAt, id) tuple the query orders by. This
    // is what the cursor is encoding. Without the row
    // comparison, using 'id < cursor' with a 'usefulCount'
    // order would skip or duplicate rows that share a
    // usefulCount.
    const decoded = rawCursor ? decodeCursor(sort, rawCursor) : null
    if (decoded) {
      if (sort === "latest") {
        // rows where (createdAt, id) < (cursor.createdAt, cursor.id)
        //   = createdAt < cursor.createdAt
        //   OR (createdAt == cursor.createdAt AND id < cursor.id)
        conditions.push(
          or(
            lt(reviews.createdAt, decoded.createdAt),
            and(
              eq(reviews.createdAt, decoded.createdAt),
              lt(reviews.id, decoded.id)
            )
          )!
        )
      } else {
        // rows where (usefulCount, createdAt, id) < cursor tuple
        conditions.push(
          or(
            lt(reviews.usefulCount, decoded.usefulCount),
            and(
              eq(reviews.usefulCount, decoded.usefulCount),
              lt(reviews.createdAt, decoded.createdAt)
            ),
            and(
              eq(reviews.usefulCount, decoded.usefulCount),
              eq(reviews.createdAt, decoded.createdAt),
              lt(reviews.id, decoded.id)
            )
          )!
        )
      }
    }

    // Determine ordering
    const orderBy =
      sort === "latest"
        ? [desc(reviews.createdAt), desc(reviews.id)]
        : [desc(reviews.usefulCount), desc(reviews.createdAt), desc(reviews.id)]

    const rows = await db
      .select()
      .from(reviews)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const resultRows = hasMore ? rows.slice(0, limit) : rows
    const last = resultRows[resultRows.length - 1]

    return NextResponse.json({
      reviews: resultRows.map(toPublicReviewView),
      nextCursor: hasMore && last
        ? encodeCursor(sort, last.usefulCount, last.createdAt, last.id)
        : null,
    })
  } catch (error) {
    console.error("GET /api/companies/:id/reviews failed:", error)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}

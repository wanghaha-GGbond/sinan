import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull, sql } from "drizzle-orm"
import { companies } from "@/db/schema/companies"
import { reviews } from "@/db/schema/reviews"
import { toPublicCompanyView } from "@/lib/server/company-view"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  try {
    const { db } = await import("@/db/client")

    // 1. Find company — must be visible (not deleted, reviewable)
    const [companyRow] = await db
      .select()
      .from(companies)
      .where(
        and(
          eq(companies.id, companyId),
          isNull(companies.deletedAt),
          eq(companies.reviewStatus, "reviewable")
        )
      )
      .limit(1)

    if (!companyRow) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // 2. Load visible review count + aggregate scores from reviews table
      const reviewAggregates = await db
      .select({
        avgDirection: sql<number>`round(avg(${reviews.directionScore})::numeric, 1)`,
        recommendCount: sql<number>`count(*) filter (where ${reviews.recommendToJoin} = true)`,
        totalCount: sql<number>`count(*)`,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.companyId, companyId),
          eq(reviews.status, "visible"),
          isNull(reviews.deletedAt)
        )
      )

    const agg = reviewAggregates[0]
    const reviewCount = Number(agg?.totalCount ?? 0)
    const directionScore =
      reviewCount > 0 && agg?.avgDirection != null
        ? Number(agg.avgDirection)
        : 0
    const recommendationRate =
      reviewCount > 0 && agg?.recommendCount != null
        ? Math.round((Number(agg.recommendCount) / reviewCount) * 100)
        : 0

    // 3. Build public company view via existing helper
    const base = toPublicCompanyView(companyRow)

    // 4. Derive riskLevel / riskTags / highlights from company data
    //    (these are populated by admins/AI when reviews exist; default to empty for new companies)
    const riskLevel: "低" | "中" | "高" = (companyRow as Record<string, unknown>).riskLevel as "低" | "中" | "高" ?? "低"
    const riskTags: string[] = (companyRow as Record<string, unknown>).riskTags as string[] ?? []
    const highlights: string[] = (companyRow as Record<string, unknown>).highlights as string[] ?? []

    return NextResponse.json({
      company: {
        id: base.id,
        name: base.name,
        shortName: base.shortName,
        industry: base.industry,
        city: base.city,
        size: base.size,
        financingStage: base.financingStage,
        directionScore,
        recommendationRate,
        reviewCount,
        salaryRange: null,
        riskLevel,
        riskTags,
        highlights,
        description: base.description,
        claimedStatus: base.claimedStatus,
        reviewStatus: base.reviewStatus,
      },
    })
  } catch (error) {
    console.error("GET /api/companies/[id] failed:", error)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}
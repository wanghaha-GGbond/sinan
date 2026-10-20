import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import { companies } from "@/db/schema/companies"
import { reviews } from "@/db/schema/reviews"
import { toPublicCompanyView } from "@/lib/server/company-view"
import { inferPublicCBTI } from "@/lib/server/company-cbti"
import { getMockCompany, mockCompanyToPublicView } from "@/lib/server/public-company-data"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  try {
    if (!process.env.DATABASE_URL) {
      if (process.env.NEXT_PUBLIC_APP_ENV === "production") {
        return NextResponse.json(
          { error: "Service unavailable" },
          { status: 503 },
        )
      }

      const mockCompany = getMockCompany(companyId)
      if (!mockCompany) return NextResponse.json({ error: "Company not found" }, { status: 404 })
      return NextResponse.json({ company: mockCompanyToPublicView(mockCompany) })
    }

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
        score0to2: sql<number>`count(*) filter (where ${reviews.directionScore} < 2)`,
        score2to4: sql<number>`count(*) filter (where ${reviews.directionScore} >= 2 and ${reviews.directionScore} < 4)`,
        score4to6: sql<number>`count(*) filter (where ${reviews.directionScore} >= 4 and ${reviews.directionScore} < 6)`,
        score6to8: sql<number>`count(*) filter (where ${reviews.directionScore} >= 6 and ${reviews.directionScore} < 8)`,
        score8to10: sql<number>`count(*) filter (where ${reviews.directionScore} >= 8)`,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.companyId, companyId),
          inArray(reviews.status, ["visible", "limited_visible"]),
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

    const signalRows = await db
      .select({ directionScore: reviews.directionScore, questionnaire: reviews.questionnaire })
      .from(reviews)
      .where(
        and(
          eq(reviews.companyId, companyId),
          inArray(reviews.status, ["visible", "limited_visible"]),
          isNull(reviews.deletedAt)
        )
      )

    // 3. Build public company view via existing helper
    const base = toPublicCompanyView(companyRow)

    // 4. Derive riskLevel / riskTags / highlights from company data
    //    (these are populated by admins/AI when reviews exist; default to empty for new companies)
    const riskLevel: "低" | "中" | "高" = (companyRow as Record<string, unknown>).riskLevel as "低" | "中" | "高" ?? "低"
    const riskTags: string[] = (companyRow as Record<string, unknown>).riskTags as string[] ?? []
    const highlights: string[] = (companyRow as Record<string, unknown>).highlights as string[] ?? []

    return NextResponse.json({
      company: {
        ...base,
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
        scoreDistribution: [
          { score: "0-2", count: Number(agg?.score0to2 ?? 0) },
          { score: "2-4", count: Number(agg?.score2to4 ?? 0) },
          { score: "4-6", count: Number(agg?.score4to6 ?? 0) },
          { score: "6-8", count: Number(agg?.score6to8 ?? 0) },
          { score: "8-10", count: Number(agg?.score8to10 ?? 0) },
        ],
        cbti: inferPublicCBTI(signalRows),
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

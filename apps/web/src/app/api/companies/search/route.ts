import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm"
import { companies } from "@/db/schema/companies"
import { reviews } from "@/db/schema/reviews"
import { toPublicCompanyView } from "@/lib/server/company-view"
import { inferPublicCBTI } from "@/lib/server/company-cbti"
import { mockCompanyToPublicView } from "@/lib/server/public-company-data"
import { companies as mockCompanies } from "@/lib/mock-data"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") ?? "").trim()
  const city = searchParams.get("city") ?? undefined
  const industry = searchParams.get("industry") ?? undefined

  // TODO: includeMySubmissions will be supported once anonymous profile auth is in place
  // const includeMySubmissions = searchParams.get("includeMySubmissions") === "true"

  try {
    if (!process.env.DATABASE_URL) {
      const normalizedQuery = q.toLowerCase()
      const matchingCompanies = mockCompanies.filter((company) => {
        const matchesQuery = !normalizedQuery || [company.name, company.shortName, company.englishName, ...(company.alias ?? [])]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery))
        const matchesCity = !city || company.city === city
        const matchesIndustry = !industry || company.industry === industry
        return matchesQuery && matchesCity && matchesIndustry
      })
      return NextResponse.json({ companies: matchingCompanies.map(mockCompanyToPublicView) })
    }

    const { db } = await import("@/db/client")

    const conditions: ReturnType<typeof and>[] = [
      eq(companies.reviewStatus, "reviewable"),
      isNull(companies.deletedAt),
    ]

    if (city) {
      conditions.push(eq(companies.city, city))
    }
    if (industry) {
      conditions.push(eq(companies.industry, industry))
    }

    if (q) {
      const pattern = `%${q}%`
      conditions.push(
        or(
          sql`${companies.name} ILIKE ${pattern}`,
          sql`${companies.shortName} ILIKE ${pattern}`,
          sql`${companies.registeredName} ILIKE ${pattern}`,
          sql`${companies.englishName} ILIKE ${pattern}`
        )!
      )
    }

    const rows = await db
      .select()
      .from(companies)
      .where(and(...conditions))
      .orderBy(sql`${companies.createdAt} DESC`)
      .limit(50)

    if (!rows.length) return NextResponse.json({ companies: [] })

    const companyIds = rows.map((row) => row.id)
    const [aggregates, signalRows] = await Promise.all([
      db
        .select({
          companyId: reviews.companyId,
          avgDirection: sql<number>`round(avg(${reviews.directionScore})::numeric, 1)`,
          recommendCount: sql<number>`count(*) filter (where ${reviews.recommendToJoin} = true)`,
          totalCount: sql<number>`count(*)`,
        })
        .from(reviews)
        .where(
          and(
            inArray(reviews.companyId, companyIds),
            inArray(reviews.status, ["visible", "limited_visible"]),
            isNull(reviews.deletedAt),
          ),
        )
        .groupBy(reviews.companyId),
      db
        .select({ companyId: reviews.companyId, directionScore: reviews.directionScore, questionnaire: reviews.questionnaire })
        .from(reviews)
        .where(
          and(
            inArray(reviews.companyId, companyIds),
            inArray(reviews.status, ["visible", "limited_visible"]),
            isNull(reviews.deletedAt),
          ),
        ),
    ])
    const aggregateByCompany = new Map(aggregates.map((item) => [item.companyId, item]))

    return NextResponse.json({
      companies: rows.map((row) => {
        const aggregate = aggregateByCompany.get(row.id)
        const reviewCount = Number(aggregate?.totalCount ?? 0)
        return {
          ...toPublicCompanyView(row),
          directionScore: reviewCount ? Number(aggregate?.avgDirection ?? 0) : 0,
          recommendationRate: reviewCount
            ? Math.round((Number(aggregate?.recommendCount ?? 0) / reviewCount) * 100)
            : 0,
          reviewCount,
          cbti: inferPublicCBTI(signalRows.filter((signal) => signal.companyId === row.id)),
        }
      }),
    })
  } catch (error) {
    console.error("GET /api/companies/search failed:", error)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}

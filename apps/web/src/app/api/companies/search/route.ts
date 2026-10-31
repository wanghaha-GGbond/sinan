import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull, or, sql } from "drizzle-orm"
import { companies } from "@/db/schema/companies"
import { companyStatistics } from "@/lib/server/company-statistics"
import { toPublicCompanyView } from "@/lib/server/company-view"
import { inferPublicCBTI } from "@/lib/server/company-cbti"
import { mockCompanyToPublicView } from "@/lib/server/public-company-data"
import { companies as mockCompanies } from "@/lib/mock-data"

const publicCacheHeaders = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") ?? "").trim()
  const city = searchParams.get("city") ?? undefined
  const industry = searchParams.get("industry") ?? undefined

  // TODO: includeMySubmissions will be supported once anonymous profile auth is in place
  // const includeMySubmissions = searchParams.get("includeMySubmissions") === "true"

  try {
    if (!process.env.DATABASE_URL) {
      if (process.env.NEXT_PUBLIC_APP_ENV === "production") {
        return NextResponse.json(
          { error: "Service unavailable" },
          { status: 503 },
        )
      }

      const normalizedQuery = q.toLowerCase()
      const matchingCompanies = mockCompanies.filter((company) => {
        const matchesQuery = !normalizedQuery || [company.name, company.shortName, company.englishName, ...(company.alias ?? [])]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery))
        const matchesCity = !city || company.city === city
        const matchesIndustry = !industry || company.industry === industry
        return matchesQuery && matchesCity && matchesIndustry
      })
      return NextResponse.json(
        { companies: matchingCompanies.map(mockCompanyToPublicView) },
        { headers: publicCacheHeaders },
      )
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
      .select({ company: companies, statistics: companyStatistics() })
      .from(companies)
      .where(and(...conditions))
      .orderBy(sql`${companies.createdAt} DESC`)
      .limit(50)

    if (!rows.length) return NextResponse.json({ companies: [] }, { headers: publicCacheHeaders })

    return NextResponse.json(
      {
        companies: rows.map(({ company: row, statistics: aggregate }) => {
          const reviewCount = Number(aggregate?.totalCount ?? 0)
          return {
            ...toPublicCompanyView(row),
            directionScore: reviewCount ? Number(aggregate?.avgDirection ?? 0) : 0,
            recommendationRate: reviewCount
              ? Math.round((Number(aggregate?.recommendCount ?? 0) / reviewCount) * 100)
              : 0,
            reviewCount,
            cbti: inferPublicCBTI(aggregate.signals),
          }
        }),
      },
      { headers: publicCacheHeaders },
    )
  } catch (error) {
    console.error("GET /api/companies/search failed:", error)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}

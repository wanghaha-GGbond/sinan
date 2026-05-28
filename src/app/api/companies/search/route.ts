import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull, or, sql } from "drizzle-orm"
import { companies } from "@/db/schema/companies"
import { toPublicCompanyView } from "@/lib/server/company-view"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") ?? "").trim()
  const city = searchParams.get("city") ?? undefined
  const industry = searchParams.get("industry") ?? undefined

  // TODO: includeMySubmissions will be supported once anonymous profile auth is in place
  // const includeMySubmissions = searchParams.get("includeMySubmissions") === "true"

  try {
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

    return NextResponse.json({
      companies: rows.map(toPublicCompanyView),
    })
  } catch (error) {
    console.error("GET /api/companies/search failed:", error)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}

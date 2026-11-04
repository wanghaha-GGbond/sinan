import { and, eq, isNull } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { companies } from "@/db/schema/companies"
import { isPulseEnabled } from "@/lib/pulse-feature"
import { getCompanyPulse } from "@/lib/server/pulse-company"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "no-store" }
  if (!isPulseEnabled({ NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV, NEXT_PUBLIC_PULSE_ENABLED: process.env.NEXT_PUBLIC_PULSE_ENABLED })) return NextResponse.json({ error: "Not found" }, { status: 404, headers })
  const { id } = await params
  if (!z.uuid().safeParse(id).success || request.nextUrl.searchParams.size) return NextResponse.json({ error: "Invalid request" }, { status: 400, headers })
  try {
    const { db } = await import("@/db/client")
    const [company] = await db.select({ id: companies.id, name: companies.name }).from(companies)
      .where(and(eq(companies.id, id), eq(companies.reviewStatus, "reviewable"), isNull(companies.deletedAt))).limit(1)
    if (!company) return NextResponse.json({ error: "Not found" }, { status: 404, headers })
    return NextResponse.json({ company, ...await getCompanyPulse(id) }, { headers })
  } catch {
    console.error(JSON.stringify({ event: "company_pulse_unavailable" }))
    return NextResponse.json({ error: "公司趋势暂时无法加载" }, { status: 503, headers })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getPublicCompanyDetail } from "@/lib/server/public-company-data"

/** Keep browser/API/iOS scores on the same public-read policy and aggregation. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!process.env.DATABASE_URL && process.env.NEXT_PUBLIC_APP_ENV === "production") {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }
  try {
    const company = await getPublicCompanyDetail(id)
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })
    return NextResponse.json({ company })
  } catch {
    console.error(JSON.stringify({ event: "company_detail_failed" }))
    return NextResponse.json({ error: "公司信息暂时无法加载，请重试" }, { status: 503 })
  }
}

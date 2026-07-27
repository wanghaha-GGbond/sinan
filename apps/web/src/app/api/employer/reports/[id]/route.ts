/**
 * GET /api/employer/reports/[id] — 单份报告详情 (聚合 content,运营/内部查看)
 */
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { employerReports } from "@/db/schema/m4-features"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 })
  }
  try {
    const { db } = await import("@/db/client")
    const [row] = await db
      .select()
      .from(employerReports)
      .where(eq(employerReports.id, id))
      .limit(1)
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    return NextResponse.json({ report: row })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
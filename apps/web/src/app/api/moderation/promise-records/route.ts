import { NextResponse } from "next/server"
import { asc, eq } from "drizzle-orm"

import { promiseRecords } from "@/db/schema/promise-records"
import { requireModerator } from "@/lib/server/auth"

export async function GET() {
  try {
    await requireModerator()
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }
  try {
    const { db } = await import("@/db/client")
    const rows = await db
      .select({
        id: promiseRecords.id,
        companyId: promiseRecords.companyId,
        promiseCategory: promiseRecords.promiseCategory,
        promiseText: promiseRecords.promiseText,
        promiseDate: promiseRecords.promiseDate,
        outcomeText: promiseRecords.outcomeText,
        outcomeStatus: promiseRecords.outcomeStatus,
        evidenceType: promiseRecords.evidenceType,
        createdAt: promiseRecords.createdAt,
      })
      .from(promiseRecords)
      .where(eq(promiseRecords.status, "pending_review"))
      .orderBy(asc(promiseRecords.createdAt))
      .limit(100)
    return NextResponse.json({ records: rows })
  } catch {
    return NextResponse.json({ error: "审核队列加载失败" }, { status: 503 })
  }
}

/**
 * GET /api/markets/[id] — 市场详情 + 票数聚合
 */
import { NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"

import { predictionBets, predictionMarkets } from "@/db/schema/m4-features"

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

    const [market] = await db
      .select()
      .from(predictionMarkets)
      .where(eq(predictionMarkets.id, id))
      .limit(1)
    if (!market) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    // 每个 outcome 的票数 + points 总和
    const tally = await db
      .select({
        outcome: predictionBets.outcome,
        betCount: sql<number>`count(*)::int`,
        totalPoints: sql<number>`coalesce(sum(${predictionBets.pointsBet}),0)::int`,
      })
      .from(predictionBets)
      .where(eq(predictionBets.marketId, id))
      .groupBy(predictionBets.outcome)

    return NextResponse.json({ market, tally })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
/**
 * GET  /api/markets — 公开市场列表(开放 / 已结算)
 * POST /api/markets — 创建市场 (moderator)
 */
import { NextRequest, NextResponse } from "next/server"
import { desc } from "drizzle-orm"

import { predictionMarkets } from "@/db/schema/m4-features"
import {
  isValidPredictionOutcomes,
  PREDICTION_OUTCOMES_MIN,
  PREDICTION_OUTCOMES_MAX,
} from "@/lib/server/p1-m4-services"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { db } = await import("@/db/client")
    const rows = await db
      .select()
      .from(predictionMarkets)
      .orderBy(desc(predictionMarkets.createdAt))
      .limit(50)
    return NextResponse.json({ markets: rows })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), markets: [] },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { requireModerator } = await import("@/lib/server/auth")
  try {
    await requireModerator()
  } catch (resp) {
    if (resp instanceof Response) return resp
    throw resp
  }

  let body: {
    title?: unknown
    description?: unknown
    outcomes?: unknown
    closesAt?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (
    typeof body.title !== "string" ||
    body.title.trim().length === 0 ||
    typeof body.description !== "string" ||
    typeof body.closesAt !== "string"
  ) {
    return NextResponse.json({ error: "字段不合法" }, { status: 400 })
  }
  if (!isValidPredictionOutcomes(body.outcomes)) {
    return NextResponse.json(
      {
        error: `outcomes 必须是 ${PREDICTION_OUTCOMES_MIN}-${PREDICTION_OUTCOMES_MAX} 个非空字符串`,
      },
      { status: 400 }
    )
  }
  const closesAt = new Date(body.closesAt)
  if (Number.isNaN(closesAt.getTime())) {
    return NextResponse.json({ error: "closesAt 非法" }, { status: 400 })
  }

  try {
    const { db } = await import("@/db/client")
    const [row] = await db
      .insert(predictionMarkets)
      .values({
        title: body.title.trim(),
        description: body.description.trim(),
        outcomes: body.outcomes,
        closesAt,
      })
      .returning()
    return NextResponse.json({ market: row })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
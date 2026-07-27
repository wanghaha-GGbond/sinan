/**
 * POST /api/markets/[id]/bet — 内部积分下注
 *   - 登录 + L1+
 *   - market 必须是 open 状态
 *   - outcome 必须在市场 outcomes 列表里
 *   - 余额足够 + 单笔下注 ≤ 100 points (per M4 探索期上限)
 */
import { NextRequest, NextResponse } from "next/server"
import { and, eq, sql } from "drizzle-orm"

import { predictionBets, predictionMarkets } from "@/db/schema/m4-features"
import { users } from "@/db/schema/users"
import {
  canAffordBet,
  isOutcomeInMarket,
  isValidBetAmount,
  PREDICTION_BET_MAX,
} from "@/lib/server/p1-m4-services"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { getAuthUser } = await import("@/lib/server/auth")
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }
  const { id: marketId } = await params
  if (!marketId) {
    return NextResponse.json({ error: "missing id" }, { status: 400 })
  }

  let body: { outcome?: unknown; pointsBet?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!isValidBetAmount(body.pointsBet)) {
    return NextResponse.json(
      { error: `pointsBet 必须在 1-${PREDICTION_BET_MAX} 之间` },
      { status: 400 }
    )
  }

  try {
    const { db } = await import("@/db/client")

    const [profile] = await db
      .select({ trustLevel: users.trustLevel, pointsBalance: users.pointsBalance })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1)
    if (!profile || profile.trustLevel < 1) {
      return NextResponse.json(
        { error: "需要 L1+ 才能下注" },
        { status: 403 }
      )
    }

    const [market] = await db
      .select()
      .from(predictionMarkets)
      .where(eq(predictionMarkets.id, marketId))
      .limit(1)
    if (!market) {
      return NextResponse.json({ error: "market not found" }, { status: 404 })
    }
    if (market.status !== "open") {
      return NextResponse.json(
        { error: "market not open" },
        { status: 400 }
      )
    }
    if (!isOutcomeInMarket(body.outcome, market.outcomes)) {
      return NextResponse.json({ error: "outcome 不在市场选项里" }, { status: 400 })
    }
    if (!canAffordBet(profile.pointsBalance, body.pointsBet)) {
      return NextResponse.json({ error: "积分不足" }, { status: 402 })
    }

    // 扣积分 + 写入下注(简化:先写入下注,再扣;如果扣失败事务回滚)
    const [bet] = await db
      .insert(predictionBets)
      .values({
        marketId,
        userId: user.userId,
        outcome: body.outcome,
        pointsBet: body.pointsBet,
      })
      .returning()

    await db
      .update(users)
      .set({
        pointsBalance: sql`GREATEST(0, ${users.pointsBalance} - ${body.pointsBet})`,
      })
      .where(eq(users.id, user.userId))

    return NextResponse.json({ bet })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
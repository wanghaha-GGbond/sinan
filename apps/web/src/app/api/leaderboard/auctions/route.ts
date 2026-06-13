/**
 * GET /api/leaderboard/auctions?hostId=&limit=&cursor=
 *
 * 拍卖行情榜。只取 status='settled' 的专场,按 settledAt DESC + id DESC。
 *
 * 匿名规则(08 §2):
 *   - 行情榜不返回 bidder 身份 / bid 金额明细
 *   - 只返回 host(嘉宾是公开身份)、成交金额、出价人数、心动权标记、是否全捐
 *   - 嘉宾段位是公开线索(spec §1 嘉宾门槛 L2+ 是公开的)
 */
import { NextRequest, NextResponse } from "next/server"

import { getAuctionLeaderboard } from "@/lib/server/auction-leaderboard"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const hostId = searchParams.get("hostId") ?? undefined
  const limitRaw = searchParams.get("limit")
  const cursor = searchParams.get("cursor") ?? undefined

  const limit = limitRaw ? Number(limitRaw) : undefined
  if (limit !== undefined && (!Number.isFinite(limit) || limit < 1)) {
    return NextResponse.json({ error: "limit 非法" }, { status: 400 })
  }

  try {
    const page = await getAuctionLeaderboard({ hostId, limit, cursor })
    return NextResponse.json(page)
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
/**
 * POST /api/auctions/[id]/heart-pick  { bidId }
 *
 * 嘉宾行使心动权。仅 hostUserId 可调。
 *
 * - auction.status 必须为 'closed'
 * - bid.status 必须为 'active'
 * - 互斥:settled 状态不允许再调(防止 double-settle)
 */
import { NextRequest, NextResponse } from "next/server"

import {
  AuctionEngineError,
  exerciseHeartPick,
} from "@/lib/server/auction-engine"
import { eq } from "drizzle-orm"

import { auctions } from "@/db/schema/auctions"
import { requireAuthUser } from "@/lib/server/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let actor
  try {
    actor = await requireAuthUser()
  } catch (resp) {
    return resp as Response
  }

  const { id: auctionId } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const bidId = String(body.bidId ?? "")
  if (!bidId) {
    return NextResponse.json({ error: "bidId 必填" }, { status: 400 })
  }

  try {
    const { db } = await import("@/db/client")
    // 权限校验:只有 hostUserId 能行使心动权
    const [auction] = await db
      .select({ hostUserId: auctions.hostUserId })
      .from(auctions)
      .where(eq(auctions.id, auctionId))
      .limit(1)
    if (!auction) {
      return NextResponse.json({ error: "专场不存在" }, { status: 404 })
    }
    if (auction.hostUserId !== actor.userId) {
      return NextResponse.json(
        { error: "只有嘉宾本人能行使心动权" },
        { status: 403 }
      )
    }

    const result = await exerciseHeartPick(auctionId, bidId, actor.userId)
    return NextResponse.json({ ok: true, ...result })
  } catch (e: unknown) {
    if (e instanceof AuctionEngineError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.status }
      )
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
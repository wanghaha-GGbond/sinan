/**
 * GET /api/circles/[id]/members — list active members of a circle.
 *
 * Per spec: 匿名优先 — 只返回段位 + 职级(模糊化) + 加入时间,
 * 不返回 userId/displayName. 防止外部爬成员身份。
 */
import { NextRequest, NextResponse } from "next/server"

import { listCircleMembers } from "@/lib/server/circles"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }
  try {
    const members = await listCircleMembers(id)
    return NextResponse.json({ members })
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }
}

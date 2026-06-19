/**
 * GET  /api/gratitude — 公开流(per spec "没审核就全显")
 * POST /api/gratitude — 写一封感谢信 (登录 + L1+,12 小时封顶)
 */
import { NextRequest, NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"

import { gratitude } from "@/db/schema/p1-features"
import { users } from "@/db/schema/users"
import {
  isValidGratitudeContent,
  isWithinGratitudeWindow,
} from "@/lib/server/p1-m4-services"
import { hasAttackWord, hasSensitive, maskSensitiveContent } from "@/lib/content-guard"
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rate-limit"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { db } = await import("@/db/client")
    const rows = await db
      .select({
        id: gratitude.id,
        fromUserId: gratitude.fromUserId,
        toUserId: gratitude.toUserId,
        content: gratitude.content,
        isAnonymous: gratitude.isAnonymous,
        createdAt: gratitude.createdAt,
        fromDisplayName: users.displayName,
        fromJobBand: users.jobBand,
        fromTrustLevel: users.trustLevel,
      })
      .from(gratitude)
      .leftJoin(users, eq(users.id, gratitude.fromUserId))
      .orderBy(desc(gratitude.createdAt))
      .limit(50)
    return NextResponse.json({ items: rows })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), items: [] },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { getAuthUser } = await import("@/lib/server/auth")
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  // Per-user/IP throttle. Gratitude has a 12h per-pair cap inside the
  // service, but a malicious account could target many different users
  // — outer per-account rate limit closes that hole.
  const rl = checkRateLimit(
    `gratitude-submit:${user.userId}:${getRateLimitKey(request, "/api/gratitude")}`,
    { maxRequests: 10, windowSeconds: 60 }
  )
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "提交太频繁，请稍后再试", retryAfter: rl.retryAfter },
      { status: 429 }
    )
  }

  let body: { toUserId?: unknown; content?: unknown; isAnonymous?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (typeof body.toUserId !== "string" || !body.toUserId) {
    return NextResponse.json({ error: "missing toUserId" }, { status: 400 })
  }
  if (body.toUserId === user.userId) {
    return NextResponse.json({ error: "不能给自己写感谢信" }, { status: 400 })
  }
  if (!isValidGratitudeContent(body.content)) {
    return NextResponse.json({ error: "内容长度不合法" }, { status: 400 })
  }

  // PII / attack-word guard. Gratitude is "no moderation" per spec
  // (rendered immediately), so the guard is the only safety net.
  const content = body.content.trim()
  if (hasSensitive(content) || hasAttackWord(content)) {
    return NextResponse.json(
      { error: "内容包含不适合公开展示的信息，请调整后再发布。" },
      { status: 400 }
    )
  }

  try {
    const { db } = await import("@/db/client")

    const [profile] = await db
      .select({ trustLevel: users.trustLevel })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1)
    if (!profile || profile.trustLevel < 1) {
      return NextResponse.json(
        { error: "需要 L1+ 才能写感谢信" },
        { status: 403 }
      )
    }

    // 12 小时封顶:查 fromUser 上次给 toUser 写信的时间
    const { and, desc: drizzleDesc } = await import("drizzle-orm")
    const [last] = await db
      .select({ createdAt: gratitude.createdAt })
      .from(gratitude)
      .where(
        and(
          eq(gratitude.fromUserId, user.userId),
          eq(gratitude.toUserId, body.toUserId)
        )
      )
      .orderBy(drizzleDesc(gratitude.createdAt))
      .limit(1)

    if (last && isWithinGratitudeWindow(last.createdAt)) {
      return NextResponse.json(
        { error: "12 小时内已给该用户写过感谢信" },
        { status: 429 }
      )
    }

    const [row] = await db
      .insert(gratitude)
      .values({
        fromUserId: user.userId,
        toUserId: body.toUserId,
        content: maskSensitiveContent(content),
        isAnonymous: body.isAnonymous === true ? "true" : "false",
      })
      .returning()

    return NextResponse.json({ gratitude: row })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
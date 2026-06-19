/**
 * GET  /api/highlights — 公开 approved 高光池
 * POST /api/highlights — 提交一段高光,登录 + L1+
 */
import { NextRequest, NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"

import { highlights } from "@/db/schema/p1-features"
import { users } from "@/db/schema/users"
import {
  HIGHLIGHT_CONTENT_MAX,
  HIGHLIGHT_CONTENT_MIN,
  isValidHighlightContent,
} from "@/lib/server/p1-m4-services"
import { hasAttackWord, hasSensitive, maskSensitiveContent } from "@/lib/content-guard"
import { checkRateLimit } from "@/lib/server/rate-limit"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { db } = await import("@/db/client")
    const rows = await db
      .select({
        id: highlights.id,
        content: highlights.content,
        createdAt: highlights.createdAt,
        userId: highlights.userId,
        displayName: users.displayName,
        jobBand: users.jobBand,
        trustLevel: users.trustLevel,
      })
      .from(highlights)
      .leftJoin(users, eq(users.id, highlights.userId))
      .where(eq(highlights.status, "approved"))
      .orderBy(desc(highlights.createdAt))
      .limit(50)

    return NextResponse.json({ highlights: rows })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), highlights: [] },
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

  // Per-user throttle: prevents a single account from spamming the
  // moderation queue. 10/minute is well above the natural rate at
  // which a human writes new highlights.
  const rl = checkRateLimit(
    `highlight-submit:${user.userId}`,
    { maxRequests: 10, windowSeconds: 60 }
  )
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "提交太频繁，请稍后再试", retryAfter: rl.retryAfter },
      { status: 429 }
    )
  }

  let body: { content?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!isValidHighlightContent(body.content)) {
    return NextResponse.json(
      {
        error: `内容需 ${HIGHLIGHT_CONTENT_MIN}-${HIGHLIGHT_CONTENT_MAX} 字`,
      },
      { status: 400 }
    )
  }

  // PII / attack-word guard — same gate as reviews and discussions, so
  // high-light content cannot leak phone/email or use slur vocabulary.
  const trimmedContent = body.content.trim()
  if (hasSensitive(trimmedContent) || hasAttackWord(trimmedContent)) {
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
        { error: "需要 L1+ 才能提交高光" },
        { status: 403 }
      )
    }

    const [row] = await db
      .insert(highlights)
      .values({
        userId: user.userId,
        content: maskSensitiveContent(trimmedContent),
        status: "pending",
      })
      .returning()

    return NextResponse.json({ highlight: row })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
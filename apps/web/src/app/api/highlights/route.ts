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
        content: body.content.trim(),
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
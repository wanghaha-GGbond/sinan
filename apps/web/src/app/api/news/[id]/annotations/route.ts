/**
 * POST /api/news/[id]/annotations — 给文章写批注 (登录 + L1+,匿名优先)
 */
import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { newsAnnotations, newsArticles } from "@/db/schema/m4-features"
import { users } from "@/db/schema/users"

export const dynamic = "force-dynamic"

const ANNOTATION_MIN = 10
const ANNOTATION_MAX = 500

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { getAuthUser } = await import("@/lib/server/auth")
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }
  const { id: articleId } = await params
  if (!articleId) {
    return NextResponse.json({ error: "missing id" }, { status: 400 })
  }

  let body: { content?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (
    typeof body.content !== "string" ||
    body.content.trim().length < ANNOTATION_MIN ||
    body.content.trim().length > ANNOTATION_MAX
  ) {
    return NextResponse.json(
      { error: `内容需 ${ANNOTATION_MIN}-${ANNOTATION_MAX} 字` },
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
        { error: "需要 L1+ 才能写批注" },
        { status: 403 }
      )
    }

    // 文章必须存在
    const [article] = await db
      .select({ id: newsArticles.id })
      .from(newsArticles)
      .where(eq(newsArticles.id, articleId))
      .limit(1)
    if (!article) {
      return NextResponse.json({ error: "article not found" }, { status: 404 })
    }

    const [row] = await db
      .insert(newsAnnotations)
      .values({
        articleId,
        annotatorUserId: user.userId,
        content: body.content.trim(),
        status: "visible",
      })
      .returning()
    return NextResponse.json({ annotation: row })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
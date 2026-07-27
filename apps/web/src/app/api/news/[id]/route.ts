/**
 * GET /api/news/[id] — 文章详情 + 可见批注
 */
import { NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"

import { newsAnnotations, newsArticles } from "@/db/schema/m4-features"
import { users } from "@/db/schema/users"

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

    const [article] = await db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.id, id))
      .limit(1)

    if (!article) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    // 批注只返回 visible 状态
    const annotations = await db
      .select({
        id: newsAnnotations.id,
        content: newsAnnotations.content,
        createdAt: newsAnnotations.createdAt,
        annotatorTrustLevel: users.trustLevel,
        annotatorJobBand: users.jobBand,
      })
      .from(newsAnnotations)
      .leftJoin(users, eq(users.id, newsAnnotations.annotatorUserId))
      .where(
        and(
          eq(newsAnnotations.articleId, id),
          eq(newsAnnotations.status, "visible")
        )
      )
      .orderBy(desc(newsAnnotations.createdAt))

    return NextResponse.json({ article, annotations })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
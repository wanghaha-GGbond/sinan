/**
 * GET /api/news — 公开文章列表
 */
import { NextResponse } from "next/server"
import { desc } from "drizzle-orm"

import { newsArticles } from "@/db/schema/m4-features"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { db } = await import("@/db/client")
    const rows = await db
      .select()
      .from(newsArticles)
      .orderBy(desc(newsArticles.publishedAt))
      .limit(50)
    return NextResponse.json({ articles: rows })
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : String(e),
        articles: [],
      },
      { status: 503 }
    )
  }
}
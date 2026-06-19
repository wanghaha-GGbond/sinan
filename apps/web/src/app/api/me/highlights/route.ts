import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { highlights } from "@/db/schema/p1-features"

export const dynamic = "force-dynamic"

export async function GET() {
  const { getAuthUser } = await import("@/lib/server/auth")
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }
  try {
    const { db } = await import("@/db/client")
    const rows = await db
      .select({
        id: highlights.id,
        content: highlights.content,
        status: highlights.status,
        createdAt: highlights.createdAt,
      })
      .from(highlights)
      .where(eq(highlights.userId, user.userId))
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

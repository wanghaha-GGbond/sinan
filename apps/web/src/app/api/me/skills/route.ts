/**
 * GET /api/me/skills — 当前用户提交的技能列表
 */
import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"

import { skills } from "@/db/schema/p1-features"

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
      .select()
      .from(skills)
      .where(eq(skills.userId, user.userId))
      .orderBy(desc(skills.createdAt))
      .limit(50)
    return NextResponse.json({ skills: rows })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), skills: [] },
      { status: 503 }
    )
  }
}
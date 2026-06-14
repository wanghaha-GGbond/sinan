/**
 * GET  /api/skills — approved 技能流
 * POST /api/skills — 提交一技 (登录 + L1+)
 */
import { NextRequest, NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"

import { skills } from "@/db/schema/p1-features"
import { users } from "@/db/schema/users"
import { isValidSkillPayload } from "@/lib/server/p1-m4-services"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { db } = await import("@/db/client")
    const rows = await db
      .select({
        id: skills.id,
        userId: skills.userId,
        name: skills.name,
        description: skills.description,
        evidenceNote: skills.evidenceNote,
        endorserCount: skills.endorserCount,
        createdAt: skills.createdAt,
        displayName: users.displayName,
        jobBand: users.jobBand,
        trustLevel: users.trustLevel,
      })
      .from(skills)
      .leftJoin(users, eq(users.id, skills.userId))
      .where(eq(skills.status, "approved"))
      .orderBy(desc(skills.endorserCount), desc(skills.createdAt))
      .limit(50)
    return NextResponse.json({ skills: rows })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), skills: [] },
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

  let body: { name?: unknown; description?: unknown; evidenceNote?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!isValidSkillPayload(body)) {
    return NextResponse.json({ error: "字段不合法" }, { status: 400 })
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
        { error: "需要 L1+ 才能提交技能" },
        { status: 403 }
      )
    }

    const [row] = await db
      .insert(skills)
      .values({
        userId: user.userId,
        name: body.name.trim(),
        description: body.description.trim(),
        evidenceNote: body.evidenceNote.trim(),
        status: "pending",
      })
      .returning()
    return NextResponse.json({ skill: row })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
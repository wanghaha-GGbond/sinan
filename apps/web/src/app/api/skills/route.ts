/**
 * GET  /api/skills — approved 技能流
 * POST /api/skills — 提交一技 (登录 + L1+)
 */
import { NextRequest, NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"

import { skills } from "@/db/schema/p1-features"
import { users } from "@/db/schema/users"
import { isValidSkillPayload } from "@/lib/server/p1-m4-services"
import { hasAttackWord, hasSensitive, maskSensitiveContent } from "@/lib/content-guard"
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rate-limit"

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

  // Per-user/IP throttle. Skills are public stream items — without a
  // cap, one account can flood the feed. Use IP fallback for unauth
  // probes (auth gate above catches them, but defense in depth).
  const rl = checkRateLimit(
    `skill-submit:${user.userId}:${getRateLimitKey(request, "/api/skills")}`,
    { maxRequests: 10, windowSeconds: 60 }
  )
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "提交太频繁，请稍后再试", retryAfter: rl.retryAfter },
      { status: 429 }
    )
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

  // PII / attack-word guard across all three free-text fields.
  // A skill submission could otherwise leak contact info in name or
  // description, or carry slur language in the evidence note.
  const name = body.name.trim()
  const description = body.description.trim()
  const evidenceNote = body.evidenceNote.trim()
  const fields = { name, description, evidenceNote }
  const tainted = (Object.keys(fields) as (keyof typeof fields)[]).find(
    (k) => hasSensitive(fields[k]) || hasAttackWord(fields[k])
  )
  if (tainted) {
    return NextResponse.json(
      { error: `${tainted} 包含不适合公开展示的信息，请调整后再发布。` },
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
        { error: "需要 L1+ 才能提交技能" },
        { status: 403 }
      )
    }

    const [row] = await db
      .insert(skills)
      .values({
        userId: user.userId,
        name: maskSensitiveContent(name),
        description: maskSensitiveContent(description),
        evidenceNote: maskSensitiveContent(evidenceNote),
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
/**
 * POST /api/skills/[id]/endorse — 背书一个技能
 *  - 登录 + L1+
 *  - 不能背书自己的技能
 *  - endorserCount >= 3 自动升级 approved (per plan)
 */
import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import {
  skillEndorsements,
  skills,
} from "@/db/schema/p1-features"
import { users } from "@/db/schema/users"
import {
  shouldPromoteSkillToApproved,
  SKILL_APPROVAL_THRESHOLD,
} from "@/lib/server/p1-m4-services"
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rate-limit"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { getAuthUser } = await import("@/lib/server/auth")
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  // Per-user/IP throttle. The unique index already blocks duplicates,
  // but a probe-storm against many different skills wastes write IO
  // and pollutes logs. 30/minute is well above genuine human rate.
  const rl = checkRateLimit(
    `skill-endorse:${user.userId}:${getRateLimitKey(request, "/api/skills/[id]/endorse")}`,
    { maxRequests: 30, windowSeconds: 60 }
  )
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "操作太频繁，请稍后再试", retryAfter: rl.retryAfter },
      { status: 429 }
    )
  }

  const { id: skillId } = await params
  if (!skillId) {
    return NextResponse.json({ error: "missing id" }, { status: 400 })
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
        { error: "需要 L1+ 才能背书" },
        { status: 403 }
      )
    }

    const [skill] = await db
      .select()
      .from(skills)
      .where(eq(skills.id, skillId))
      .limit(1)
    if (!skill) {
      return NextResponse.json({ error: "skill not found" }, { status: 404 })
    }
    if (skill.userId === user.userId) {
      return NextResponse.json(
        { error: "不能背书自己的技能" },
        { status: 400 }
      )
    }

    // 写入背书(unique index 兜底重复)
    try {
      await db.insert(skillEndorsements).values({
        skillId,
        endorserUserId: user.userId,
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return NextResponse.json(
          { error: "已经背书过该技能" },
          { status: 409 }
        )
      }
      throw e
    }

    // +1 并判定是否升级
    const newCount = skill.endorserCount + 1
    const promote = shouldPromoteSkillToApproved(newCount)
    const nextStatus =
      skill.status === "approved"
        ? "approved"
        : promote
          ? "approved"
          : skill.status

    const [updated] = await db
      .update(skills)
      .set({ endorserCount: newCount, status: nextStatus })
      .where(eq(skills.id, skillId))
      .returning()

    return NextResponse.json({
      skill: updated,
      promotedToApproved: nextStatus === "approved",
      threshold: SKILL_APPROVAL_THRESHOLD,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    )
  }
}
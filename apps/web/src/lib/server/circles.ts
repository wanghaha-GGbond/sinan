/**
 * M3 圈层服务层
 *
 * Per docs/04-spec-f3-growth.md §2:
 *   - 首批 3 圈: 总监圈(minTrustLevel=2), 出海圈(minTrustLevel=1),
 *     大模型圈(minTrustLevel=1)
 *   - 运营建圈, 不允许用户自建
 *   - 入圈: 1 名现有成员背书 + endorser 信任等级 ≥ circle.minTrustLevel
 *   - 背书与邀请同理是声誉连带: 背书人可见于成员页
 *   - 撤销: moderator 或原背书人可撤销自己背书的
 */
import { and, count, desc, eq, sql } from "drizzle-orm"

import { circleMembers, circles } from "@/db/schema/circles"
import { users } from "@/db/schema/users"

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

export const DEFAULT_CIRCLES = [
  {
    slug: "director",
    name: "总监圈",
    description: "总监级及以上同行的私密圈层, 交流团队管理与行业视野。",
    minTrustLevel: 2,
  },
  {
    slug: "overseas",
    name: "出海圈",
    description: "关注海外市场拓展、产品本地化与跨境组织建设的从业者。",
    minTrustLevel: 1,
  },
  {
    slug: "llm",
    name: "大模型圈",
    description: "聚焦大模型技术演进、应用落地与工程实践。",
    minTrustLevel: 1,
  },
] as const

/**
 * 幂等: 缺哪个 circle 就建哪个. 运营在 dashboard 点一次即可, 重复调用安全。
 */
export async function seedDefaultCircles(): Promise<void> {
  const { db } = await import("@/db/client")
  for (const c of DEFAULT_CIRCLES) {
    const [existing] = await db
      .select({ id: circles.id })
      .from(circles)
      .where(eq(circles.slug, c.slug))
      .limit(1)
    if (existing) continue
    await db.insert(circles).values({
      slug: c.slug,
      name: c.name,
      description: c.description,
      minTrustLevel: c.minTrustLevel,
      status: "active",
    })
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export type CircleListItem = {
  id: string
  name: string
  slug: string
  description: string
  minTrustLevel: number
  status: string
  memberCount: number
  myMembership: { id: string; status: string; joinedAt: Date } | null
}

/**
 * 列出所有 active 圈 + 成员数 + 当前用户是否已加入.
 * viewerUserId 可为 null (匿名访问); null 时 myMembership 永远为 null.
 */
export async function listCircles(
  viewerUserId: string | null
): Promise<CircleListItem[]> {
  const { db } = await import("@/db/client")

  const rows = await db
    .select({
      id: circles.id,
      name: circles.name,
      slug: circles.slug,
      description: circles.description,
      minTrustLevel: circles.minTrustLevel,
      status: circles.status,
      memberCount: sql<number>`count(${circleMembers.id}) filter (where ${circleMembers.status} = 'active')::int`,
    })
    .from(circles)
    .leftJoin(
      circleMembers,
      and(
        eq(circleMembers.circleId, circles.id),
        eq(circleMembers.status, "active")
      )
    )
    .where(eq(circles.status, "active"))
    .groupBy(circles.id)
    .orderBy(desc(circles.createdAt))

  let myMemberships: {
    circleId: string
    id: string
    status: string
    joinedAt: Date
  }[] = []
  if (viewerUserId) {
    myMemberships = await db
      .select({
        circleId: circleMembers.circleId,
        id: circleMembers.id,
        status: circleMembers.status,
        joinedAt: circleMembers.joinedAt,
      })
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.userId, viewerUserId),
          eq(circleMembers.status, "active")
        )
      )
  }
  const byCircle = new Map(myMemberships.map((m) => [m.circleId, m]))

  return rows.map((r) => {
    const m = byCircle.get(r.id)
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      minTrustLevel: r.minTrustLevel,
      status: r.status,
      memberCount: Number(r.memberCount ?? 0),
      myMembership: m
        ? { id: m.id, status: m.status, joinedAt: m.joinedAt }
        : null,
    }
  })
}

export type CircleMemberListItem = {
  id: string
  joinedAt: Date
  trustLevel: number
  jobBandLabel: string // 匿名化的职级
  // 注: 不返回 userId / displayName (匿名优先, 圈内人看得到成员 ID)
}

/**
 * 圈成员列表 — 匿名化: 只显示段位 + 职级(模糊化) + joinedAt
 * 真正的 userId 对 moderator 端点单独暴露。
 */
export async function listCircleMembers(
  circleId: string
): Promise<CircleMemberListItem[]> {
  const { db } = await import("@/db/client")
  const rows = await db
    .select({
      id: circleMembers.id,
      joinedAt: circleMembers.joinedAt,
      trustLevel: users.trustLevel,
      jobBand: users.jobBand,
    })
    .from(circleMembers)
    .innerJoin(users, eq(users.id, circleMembers.userId))
    .where(
      and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.status, "active")
      )
    )
    .orderBy(desc(circleMembers.joinedAt))

  return rows.map((r) => ({
    id: r.id,
    joinedAt: r.joinedAt,
    trustLevel: r.trustLevel ?? 0,
    jobBandLabel: anonymizeJobBand(r.jobBand),
  }))
}

function anonymizeJobBand(band: string | null | undefined): string {
  if (!band) return "未填"
  // 只暴露前缀 (L5/L6/L7 → L 段位), 不暴露具体 title
  const m = /^L\d+/i.exec(band)
  if (m) return m[0].toUpperCase()
  return "匿名"
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type JoinCircleResult =
  | { ok: true; membershipId: string }
  | {
      ok: false
      reason:
        | "circle_not_found"
        | "circle_archived"
        | "user_already_member"
        | "self_endorsement_not_allowed"
        | "endorser_not_member"
        | "endorser_trust_too_low"
        | "user_not_found"
        | "applicant_trust_too_low"
    }

/**
 * 加入圈层.
 *
 * - 申请人必须 trustLevel >= circle.minTrustLevel (v1 暂要求 ≥ 1, L0 用户
 *   不能背书/入圈, 这是 spec "段位门槛" 的隐含意)
 * - 背书人必须是该 circle 的 active 成员, 且 endorser.trustLevel >= circle.minTrustLevel
 * - 不允许自我背书
 * - 事务内: 写 circle_members + (可选) 校验 + 防重复
 */
export async function joinCircle(
  circleId: string,
  applicantUserId: string,
  endorsedByUserId: string
): Promise<JoinCircleResult> {
  const { db } = await import("@/db/client")

  return await db.transaction(async (tx) => {
    // 申请人
    const [applicant] = await tx
      .select({ id: users.id, trustLevel: users.trustLevel })
      .from(users)
      .where(eq(users.id, applicantUserId))
      .limit(1)
    if (!applicant) return { ok: false, reason: "user_not_found" as const }

    // circle
    const [circle] = await tx
      .select()
      .from(circles)
      .where(eq(circles.id, circleId))
      .limit(1)
    if (!circle) return { ok: false, reason: "circle_not_found" as const }
    if (circle.status !== "active")
      return { ok: false, reason: "circle_archived" as const }

    if (applicant.trustLevel < circle.minTrustLevel) {
      return { ok: false, reason: "applicant_trust_too_low" as const }
    }

    if (applicantUserId === endorsedByUserId) {
      return { ok: false, reason: "self_endorsement_not_allowed" as const }
    }

    // 背书人: 必须是该 circle 的 active 成员, 且 trustLevel >= minTrustLevel
    const [endorser] = await tx
      .select({ id: users.id, trustLevel: users.trustLevel })
      .from(users)
      .where(eq(users.id, endorsedByUserId))
      .limit(1)
    if (!endorser) {
      return { ok: false, reason: "endorser_not_member" as const }
    }

    if (endorser.trustLevel < circle.minTrustLevel) {
      return { ok: false, reason: "endorser_trust_too_low" as const }
    }

    const [endorserMembership] = await tx
      .select({ id: circleMembers.id })
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, circleId),
          eq(circleMembers.userId, endorsedByUserId),
          eq(circleMembers.status, "active")
        )
      )
      .limit(1)
    if (!endorserMembership) {
      return { ok: false, reason: "endorser_not_member" as const }
    }

    // 互斥: 申请人已经是 active 成员
    const [existing] = await tx
      .select({ id: circleMembers.id })
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, circleId),
          eq(circleMembers.userId, applicantUserId)
        )
      )
      .limit(1)
    if (existing) {
      return { ok: false, reason: "user_already_member" as const }
    }

    const [inserted] = await tx
      .insert(circleMembers)
      .values({
        circleId,
        userId: applicantUserId,
        endorsedByUserId,
        status: "active",
      })
      .returning({ id: circleMembers.id })

    return { ok: true, membershipId: inserted.id }
  })
}

export type RevokeResult =
  | { ok: true; membershipId: string }
  | { ok: false; reason: "membership_not_found" | "not_authorized" }

/**
 * 撤销成员资格.
 *
 * 授权规则:
 *   - moderator / admin: 任何成员都可撤
 *   - 普通用户 (endorser): 只能撤自己背书的成员
 */
export async function revokeMembership(
  membershipId: string,
  actor: { userId: string; role: string },
  reason: string
): Promise<RevokeResult> {
  const { db } = await import("@/db/client")

  const [target] = await db
    .select({
      id: circleMembers.id,
      status: circleMembers.status,
      endorsedByUserId: circleMembers.endorsedByUserId,
    })
    .from(circleMembers)
    .where(eq(circleMembers.id, membershipId))
    .limit(1)
  if (!target) return { ok: false, reason: "membership_not_found" }
  if (target.status === "revoked") {
    // idempotent
    return { ok: true, membershipId: target.id }
  }

  const isModerator = actor.role === "moderator" || actor.role === "admin"
  const isOriginalEndorser = actor.userId === target.endorsedByUserId
  if (!isModerator && !isOriginalEndorser) {
    return { ok: false, reason: "not_authorized" }
  }

  await db
    .update(circleMembers)
    .set({
      status: "revoked",
      revokedAt: new Date(),
      revokeReason: reason,
    })
    .where(eq(circleMembers.id, membershipId))

  return { ok: true, membershipId: target.id }
}

// ---------------------------------------------------------------------------
// Public profile helpers
// ---------------------------------------------------------------------------

/**
 * 用户所在圈层 (active only) — 用于 /u/[id] 公开主页的"圈层徽标"。
 */
export async function getUserCircles(userId: string) {
  const { db } = await import("@/db/client")
  return await db
    .select({
      circleId: circles.id,
      circleName: circles.name,
      circleSlug: circles.slug,
      minTrustLevel: circles.minTrustLevel,
      joinedAt: circleMembers.joinedAt,
    })
    .from(circleMembers)
    .innerJoin(circles, eq(circles.id, circleMembers.circleId))
    .where(
      and(
        eq(circleMembers.userId, userId),
        eq(circleMembers.status, "active"),
        eq(circles.status, "active")
      )
    )
    .orderBy(desc(circleMembers.joinedAt))
}

export async function countCircleMembers(circleId: string): Promise<number> {
  const { db } = await import("@/db/client")
  const [{ total }] = await db
    .select({ total: count() })
    .from(circleMembers)
    .where(
      and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.status, "active")
      )
    )
  return Number(total ?? 0)
}

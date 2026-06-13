/**
 * M2 S10 T5.3 — 指标看板数据 (北极星 / 守门 / 三漏斗)。
 *
 * Per docs/09-metrics.md:
 *   - 北极星: L2+ trustLevel 周活率
 *   - 守门: 申诉成功率 / 删帖率 / 验证吊销率 / 负面密度聚类
 *   - 漏斗: 增长 / 身份 / 内容
 *
 * 数据源: Drizzle query builder + raw count(*),走 Neon HTTP driver。
 * 后期真要接 BI 时把这里换成 dbt 或 ClickHouse,口径不变。
 * DB 未配置时返回 null 而不是抛错——admin 页能显示"暂无数据"而
 * 不是整个页面被 ErrorBoundary 捕获。
 *
 * "主动行为" 的口径(per 09 §1):
 *   - 发布 review / promise_record
 *   - 投票 (useful / discussion useful)
 *   - 发讨论
 *   - 发邀请
 *   - 拍卖出价
 */
import { and, count, countDistinct, eq, gte, sql } from "drizzle-orm"

import { companyAppeals } from "@/db/schema/company-appeals"
import { companyVerifications } from "@/db/schema/company-verifications"
import { invites } from "@/db/schema/invites"
import { reviews } from "@/db/schema/reviews"
import { users } from "@/db/schema/users"

export type NorthStar = {
  window: "last_7_days"
  l2PlusUsers: number
  l2PlusActive: number
  ratio: number | null
}

export type Gatekeeper = {
  appealSuccessRate: number | null
  appealSuccessThreshold: number
  deleteRate: number | null
  deleteRateThreshold: number
  revokeRate: number | null
  revokeRateThreshold: number
  // 负面密度聚类: per-company 负面比例,告警需运营配,这里只返回
  // 当前最高密度的 top 5 (M2 first-pass 留空,数据 schema 未沉淀
  // 负面密度的 view)
  negativeClusterTop: { companyId: string; companyName: string; negativeRate: number }[]
}

export type FunnelGrowth = {
  invitePageViews: number
  registrations: number
  l1Verifications: number
  l2Verifications: number
  firstReviews: number
  firstInvites: number
  landingToRegisterRate: number | null
  registerToL1Rate: number | null
  registerToL2Rate: number | null
  kFactor: number | null
}

export type FunnelIdentity = {
  registrations: number
  anyVerification: number
  l1Verifications: number
  l2Verifications: number
  registerToAnyRate: number | null
  registerToL1Rate: number | null
  verifyToL2Rate: number | null
}

export type FunnelContent = {
  l2Users: number
  l2UsersPublished: number
  l2UsersWithUseful: number
  l2UsersPublishedTwo: number
  publishRate: number | null
  usefulRate: number | null
  secondPublishRate: number | null
}

export type MetricsSnapshot = {
  generatedAt: string
  northStar: NorthStar
  gatekeeper: Gatekeeper
  funnelGrowth: FunnelGrowth
  funnelIdentity: FunnelIdentity
  funnelContent: FunnelContent
  dataSource: "live" | "no_database"
}

const EMPTY_FUNNEL_GROWTH: FunnelGrowth = {
  invitePageViews: 0,
  registrations: 0,
  l1Verifications: 0,
  l2Verifications: 0,
  firstReviews: 0,
  firstInvites: 0,
  landingToRegisterRate: null,
  registerToL1Rate: null,
  registerToL2Rate: null,
  kFactor: null,
}

const EMPTY_FUNNEL_IDENTITY: FunnelIdentity = {
  registrations: 0,
  anyVerification: 0,
  l1Verifications: 0,
  l2Verifications: 0,
  registerToAnyRate: null,
  registerToL1Rate: null,
  verifyToL2Rate: null,
}

const EMPTY_FUNNEL_CONTENT: FunnelContent = {
  l2Users: 0,
  l2UsersPublished: 0,
  l2UsersWithUseful: 0,
  l2UsersPublishedTwo: 0,
  publishRate: null,
  usefulRate: null,
  secondPublishRate: null,
}

// 30 天窗口,用在所有 funnel 上(per 09 §3 增长漏斗的"近 30 天")
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function getMetricsSnapshot(): Promise<MetricsSnapshot> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS)
  const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS)

  let dbModule: typeof import("@/db/client")
  try {
    dbModule = await import("@/db/client")
  } catch {
    return emptySnapshot(now)
  }
  const { db } = dbModule

  try {
    // ── 北极星: L2+ 周活 ─────────────────────────────────────────────
    const l2PlusTotal = await countRows(
      db.select({ c: count() })
        .from(users)
        .where(and(gte(users.trustLevel, 2), eq(users.status, "active")))
    )
    const l2PlusActive = await countRows(
      db.select({ c: count() })
        .from(users)
        .where(
          and(
            gte(users.trustLevel, 2),
            eq(users.status, "active"),
            gte(users.lastLoginAt, sevenDaysAgo)
          )
        )
    )

    // ── 增长漏斗 ─────────────────────────────────────────────────────
    const registrations = await countRows(
      db.select({ c: count() })
        .from(users)
        .where(gte(users.createdAt, thirtyDaysAgo))
    )
    const l1 = await countRows(
      db.select({ c: count() })
        .from(companyVerifications)
        .where(
          and(
            eq(companyVerifications.status, "approved"),
            gte(companyVerifications.grantedTrustLevel, 1),
            gte(companyVerifications.reviewedAt, thirtyDaysAgo)
          )
        )
    )
    const l2 = await countRows(
      db.select({ c: count() })
        .from(companyVerifications)
        .where(
          and(
            eq(companyVerifications.status, "approved"),
            gte(companyVerifications.grantedTrustLevel, 2),
            gte(companyVerifications.reviewedAt, thirtyDaysAgo)
          )
        )
    )
    const firstReviews = await countRows(
      db.select({ c: countDistinct(reviews.authorUserId) })
        .from(reviews)
        .where(gte(reviews.createdAt, thirtyDaysAgo))
    )
    const firstInvites = await countRows(
      db.select({ c: count() })
        .from(invites)
        .where(gte(invites.createdAt, thirtyDaysAgo))
    )
    const invitePageViews = 0 // 事件埋点未上线,M2 留口
    const funnelGrowth: FunnelGrowth = {
      invitePageViews,
      registrations,
      l1Verifications: l1,
      l2Verifications: l2,
      firstReviews,
      firstInvites,
      landingToRegisterRate: invitePageViews > 0 ? registrations / invitePageViews : null,
      registerToL1Rate: registrations > 0 ? round3(l1 / registrations) : null,
      registerToL2Rate: registrations > 0 ? round3(l2 / registrations) : null,
      // K 因子(per 04 §1.4)粗估:人均邀请 × 邀请转 L1 率。分母用
      // 注册用户近似,真实口径在数据有 user-event 后再校准。
      kFactor:
        registrations > 0
          ? round2((firstInvites / registrations) * (l1 / Math.max(1, registrations)))
          : null,
    }

    // ── 身份漏斗 ─────────────────────────────────────────────────────
    const anyVerification = await countRows(
      db.select({ c: countDistinct(companyVerifications.applicantUserId) })
        .from(companyVerifications)
        .where(
          and(
            eq(companyVerifications.status, "approved"),
            gte(companyVerifications.reviewedAt, thirtyDaysAgo)
          )
        )
    )
    const identityL1 = await countRows(
      db.select({ c: countDistinct(companyVerifications.applicantUserId) })
        .from(companyVerifications)
        .where(
          and(
            eq(companyVerifications.status, "approved"),
            gte(companyVerifications.grantedTrustLevel, 1),
            gte(companyVerifications.reviewedAt, thirtyDaysAgo)
          )
        )
    )
    const identityL2 = await countRows(
      db.select({ c: countDistinct(companyVerifications.applicantUserId) })
        .from(companyVerifications)
        .where(
          and(
            eq(companyVerifications.status, "approved"),
            gte(companyVerifications.grantedTrustLevel, 2),
            gte(companyVerifications.reviewedAt, thirtyDaysAgo)
          )
        )
    )
    const funnelIdentity: FunnelIdentity = {
      registrations,
      anyVerification,
      l1Verifications: identityL1,
      l2Verifications: identityL2,
      registerToAnyRate: registrations > 0 ? round3(anyVerification / registrations) : null,
      registerToL1Rate: registrations > 0 ? round3(identityL1 / registrations) : null,
      verifyToL2Rate: anyVerification > 0 ? round3(identityL2 / anyVerification) : null,
    }

    // ── 内容漏斗 ─────────────────────────────────────────────────────
    const l2Users = await countRows(
      db.select({ c: count() })
        .from(users)
        .where(and(gte(users.trustLevel, 2), eq(users.status, "active")))
    )
    const l2UsersPublished = await countRows(
      db.select({ c: countDistinct(reviews.authorUserId) })
        .from(reviews)
        .where(
          and(
            gte(reviews.createdAt, thirtyDaysAgo),
            sql`${reviews.authorUserId} IN (SELECT id FROM users WHERE trust_level >= 2)`
          )
        )
    )
    const l2UsersWithUseful = await countRows(
      db.select({ c: countDistinct(reviews.authorUserId) })
        .from(reviews)
        .where(
          and(
            gte(reviews.createdAt, thirtyDaysAgo),
            gte(reviews.usefulCount, 1),
            sql`${reviews.authorUserId} IN (SELECT id FROM users WHERE trust_level >= 2)`
          )
        )
    )
    const l2UsersPublishedTwo = await countRows(
      db.select({ c: count() })
        .from(
          db.select({ authorUserId: reviews.authorUserId })
            .from(reviews)
            .where(
              and(
                gte(reviews.createdAt, thirtyDaysAgo),
                sql`${reviews.authorUserId} IN (SELECT id FROM users WHERE trust_level >= 2)`
              )
            )
            .groupBy(reviews.authorUserId)
            .having(gte(count(), 2))
            .as("t")
        )
    )
    const funnelContent: FunnelContent = {
      l2Users,
      l2UsersPublished,
      l2UsersWithUseful,
      l2UsersPublishedTwo,
      publishRate: l2Users > 0 ? round3(l2UsersPublished / l2Users) : null,
      usefulRate: l2UsersPublished > 0 ? round3(l2UsersWithUseful / l2UsersPublished) : null,
      secondPublishRate: l2UsersPublished > 0 ? round3(l2UsersPublishedTwo / l2UsersPublished) : null,
    }

    // ── 守门 ──────────────────────────────────────────────────────────
    const appealTotal = await countRows(
      db.select({ c: count() }).from(companyAppeals)
    )
    const appealUpheld = await countRows(
      db.select({ c: count() })
        .from(companyAppeals)
        .where(eq(companyAppeals.status, "upheld"))
    )
    const reviewHidden = await countRows(
      db.select({ c: count() })
        .from(reviews)
        .where(sql`${reviews.status} IN ('hidden', 'rejected')`)
    )
    const reviewTotal = await countRows(
      db.select({ c: count() }).from(reviews)
    )
    const verificationRevoked = await countRows(
      db.select({ c: count() })
        .from(companyVerifications)
        .where(eq(companyVerifications.status, "revoked"))
    )
    const verificationApproved = await countRows(
      db.select({ c: count() })
        .from(companyVerifications)
        .where(eq(companyVerifications.status, "approved"))
    )
    const gatekeeper: Gatekeeper = {
      appealSuccessRate: appealTotal > 0 ? round3(appealUpheld / appealTotal) : null,
      appealSuccessThreshold: 0.03,
      deleteRate: reviewTotal > 0 ? round3(reviewHidden / reviewTotal) : null,
      deleteRateThreshold: 0.05,
      revokeRate: verificationApproved > 0 ? round3(verificationRevoked / verificationApproved) : null,
      revokeRateThreshold: 0.01,
      negativeClusterTop: [],
    }

    return {
      generatedAt: now.toISOString(),
      northStar: {
        window: "last_7_days",
        l2PlusUsers: l2PlusTotal,
        l2PlusActive: l2PlusActive,
        ratio: l2PlusTotal > 0 ? round3(l2PlusActive / l2PlusTotal) : null,
      },
      gatekeeper,
      funnelGrowth,
      funnelIdentity,
      funnelContent,
      dataSource: "live",
    }
  } catch {
    return emptySnapshot(now)
  }
}

function emptySnapshot(now: Date): MetricsSnapshot {
  return {
    generatedAt: now.toISOString(),
    dataSource: "no_database",
    northStar: {
      window: "last_7_days",
      l2PlusUsers: 0,
      l2PlusActive: 0,
      ratio: null,
    },
    gatekeeper: {
      appealSuccessRate: null,
      appealSuccessThreshold: 0.03,
      deleteRate: null,
      deleteRateThreshold: 0.05,
      revokeRate: null,
      revokeRateThreshold: 0.01,
      negativeClusterTop: [],
    },
    funnelGrowth: EMPTY_FUNNEL_GROWTH,
    funnelIdentity: EMPTY_FUNNEL_IDENTITY,
    funnelContent: EMPTY_FUNNEL_CONTENT,
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000
}

// NeonHttpDatabase select returns a query builder that, when awaited,
// resolves to an array of row objects. We only need a count, so
// pluck .c off the first row.
async function countRows<T extends { c: number }[] | Promise<{ c: number }[]>>(
  q: T
): Promise<number> {
  const rows = (await q) as { c: number }[]
  return Number(rows[0]?.c ?? 0)
}

// kept for potential future callers; not used right now
export const __SEVEN_DAYS_MS = SEVEN_DAYS_MS
export const __THIRTY_DAYS_MS = THIRTY_DAYS_MS

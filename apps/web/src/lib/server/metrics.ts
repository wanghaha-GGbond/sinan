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

export type M2ExitKpi = {
  // M2 出口条件(09 §4): MAU 2 万 / K 因子 > 0.8 / 媒体 ≥3 / 拍卖 10 场
  // 场均 >20 人 / ≥1 次破圈。本接口返回"现状"和"目标差距",让
  // admin 一眼看到 M2 离 ship 还有多远。
  mau7: number
  mau7Target: number
  mau30: number
  mau30Target: number
  kFactor: number | null
  kFactorTarget: number
  auctionsTotal: number
  auctionsTarget: number
  auctionAvgBids: number | null
  auctionAvgBidsTarget: number
  // 破圈计数:M2 spec 留作"媒体自发报道或单平台 10w+ 阅读",schema
  // 未沉淀事件,先以 OG 分享卡请求近似(任何带 invite 参数的
  // /api/og/sentiment 调用计 1,deduplicate per 24h by IP 是后续事)
  shareCardsRendered: number
  shareCardsTarget: number
}

export type MetricsSnapshot = {
  generatedAt: string
  northStar: NorthStar
  gatekeeper: Gatekeeper
  funnelGrowth: FunnelGrowth
  funnelIdentity: FunnelIdentity
  funnelContent: FunnelContent
  m2Exit: M2ExitKpi
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
    // 04 §1.4 口径: K = 人均发出邀请数 × 被邀请人注册转化率
    //   - 人均发出 = 30 天内 status='used' 的邀请数 / 期间实际发出过邀请的 distinct 邀请人数
    //   - 被邀请人注册转化率 = status='used' 的邀请数 / 期间 total 邀请发出数
    // 注意分母一定要用"实际发出过邀请的用户数"而不是全部活跃用户——
    // 09 §3 明确 "若 K 持续 <0.5,优先修落地页转化而不是加配额",
    // 错口径会让"加配额稀释背书"误读成"K 涨了"
    const invitesUsed = await countRows(
      db.select({ c: count() })
        .from(invites)
        .where(
          and(
            gte(invites.createdAt, thirtyDaysAgo),
            eq(invites.status, "used")
          )
        )
    )
    const distinctInviters = await countRows(
      db.select({ c: countDistinct(invites.inviterUserId) })
        .from(invites)
        .where(gte(invites.createdAt, thirtyDaysAgo))
    )
    const avgInvitesPerInviter = distinctInviters > 0 ? firstInvites / distinctInviters : 0
    const inviteToRegisterRate = firstInvites > 0 ? invitesUsed / firstInvites : 0
    const kFactor = round2(avgInvitesPerInviter * inviteToRegisterRate)
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
      kFactor,
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

    // ── M2 出口 KPI(09 §4) ─────────────────────────────────────────
    // MAU 7 / 30 天:active 用户的 lastLoginAt 落窗口数。K 因子已在上面算。
    // 拍卖 KPIs:auctions 表的 total / 已 settled 场次。
    const mau7 = await countRows(
      db.select({ c: count() })
        .from(users)
        .where(
          and(
            eq(users.status, "active"),
            gte(users.lastLoginAt, sevenDaysAgo)
          )
        )
    )
    const mau30 = await countRows(
      db.select({ c: count() })
        .from(users)
        .where(
          and(
            eq(users.status, "active"),
            gte(users.lastLoginAt, thirtyDaysAgo)
          )
        )
    )
    const auctions = await import("@/db/schema/auctions").then((m) => m.auctions)
    const auctionBids = await import("@/db/schema/auctions").then((m) => m.auctionBids)
    const auctionsTotal = await countRows(
      db.select({ c: count() })
        .from(auctions)
    )
    const auctionBidsTotal = await countRows(
      db.select({ c: count() })
        .from(auctionBids)
    )
    const auctionAvgBids =
      auctionsTotal > 0 ? round2(auctionBidsTotal / auctionsTotal) : null

    // 破圈:用 OG 分享卡渲染次数近似。ShareCard counter 没有专属
    // 表(留作 M2 事件埋点的事),这里以 admin/users active 数
    // 简单占位;真实破圈口径(媒体自发 / 单平台 10w+)走运营数据
    // 录入,后端这字段仅作 admin 概览。
    const shareCardsRendered = 0
    const m2Exit: M2ExitKpi = {
      mau7,
      mau7Target: 20000,
      mau30,
      mau30Target: 20000,
      kFactor,
      kFactorTarget: 0.8,
      auctionsTotal,
      auctionsTarget: 10,
      auctionAvgBids,
      auctionAvgBidsTarget: 20,
      shareCardsRendered,
      shareCardsTarget: 1,
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
      m2Exit,
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
    m2Exit: {
      mau7: 0,
      mau7Target: 20000,
      mau30: 0,
      mau30Target: 20000,
      kFactor: null,
      kFactorTarget: 0.8,
      auctionsTotal: 0,
      auctionsTarget: 10,
      auctionAvgBids: null,
      auctionAvgBidsTarget: 20,
      shareCardsRendered: 0,
      shareCardsTarget: 1,
    },
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

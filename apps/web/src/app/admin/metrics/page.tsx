/**
 * M2 S10 T5.3 — 指标看板 admin 页面。
 *
 * 三个区:北极星 / 守门 / 三漏斗。每个数值旁边标注 threshold,
 * 让"破线 = 守门告警"一眼可见。
 *
 * 权限:moderator + admin(09 §1 隐含——北极星和守门是平台核心数据,
 * 不对所有登录用户开放)。未配置 DB 时显示 "暂无数据" 而不是
 * 抛错——admin 知道是基础设施问题不是指标问题。
 */
import { redirect } from "next/navigation"

import { SolidCard } from "@/components/ui/solid-card"
import { requireModerator } from "@/lib/server/auth"
import {
  getMetricsSnapshot,
  type FunnelContent,
  type FunnelGrowth,
  type FunnelIdentity,
  type Gatekeeper,
  type M2ExitKpi,
  type MetricsSnapshot,
  type NorthStar,
} from "@/lib/server/metrics"

export const dynamic = "force-dynamic"

export default async function MetricsDashboardPage() {
  // Moderator gate. 09 §1 doesn't spell this out, but the北极星 +
  // 守门 are platform-level data, not user-facing.
  try {
    await requireModerator()
  } catch (response) {
    if (response instanceof Response && response.status === 401) {
      redirect("/login")
    }
    throw response
  }

  const snapshot = await getMetricsSnapshot()

  return (
    <section className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">M2 · 指标看板</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          北极星 · 守门 · 三漏斗
        </h1>
        <p className="text-xs text-muted-foreground">
          数据快照生成于 {new Date(snapshot.generatedAt).toLocaleString("zh-CN")}。
          {snapshot.dataSource === "no_database" ? (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-risk-surface px-2 py-0.5 text-destructive">
              暂未配置数据库
            </span>
          ) : null}
        </p>
      </header>

      <NorthStarSection value={snapshot.northStar} dataSource={snapshot.dataSource} />
      <M2ExitSection value={snapshot.m2Exit} />
      <GatekeeperSection value={snapshot.gatekeeper} />
      <div className="grid gap-5 md:grid-cols-3">
        <FunnelGrowthSection value={snapshot.funnelGrowth} />
        <FunnelIdentitySection value={snapshot.funnelIdentity} />
        <FunnelContentSection value={snapshot.funnelContent} />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function NorthStarSection({
  value,
  dataSource,
}: {
  value: NorthStar
  dataSource: MetricsSnapshot["dataSource"]
}) {
  return (
    <SolidCard variant="elevated" className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        北极星
      </p>
      <h2 className="mt-1 text-base font-semibold text-foreground">
        L2+ 用户周活率
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        当周有任意主动行为(发布/投票/讨论/邀请/竞拍)的 L2+ 用户 ÷ 全部 L2+ 用户
      </p>
      <div className="mt-4 flex items-end gap-6">
        <p className="text-5xl font-semibold text-foreground">
          {value.ratio === null ? "—" : `${(value.ratio * 100).toFixed(1)}%`}
        </p>
        <div className="flex flex-col text-xs text-muted-foreground">
          <span>活跃 {value.l2PlusActive}</span>
          <span>总 L2+ {value.l2PlusUsers}</span>
        </div>
      </div>
      {dataSource === "no_database" ? (
        <p className="mt-3 text-xs text-muted-foreground">
          未配置数据库时不计算。配 DATABASE_URL 后,这一行会显示实际数值。
        </p>
      ) : null}
    </SolidCard>
  )
}

function GatekeeperSection({ value }: { value: Gatekeeper }) {
  const rows: { label: string; value: number | null; threshold: number; format: (v: number) => string }[] = [
    {
      label: "评价被申诉成功率",
      value: value.appealSuccessRate,
      threshold: value.appealSuccessThreshold,
      format: (v) => `${(v * 100).toFixed(1)}%`,
    },
    {
      label: "删帖率(非作者自删)",
      value: value.deleteRate,
      threshold: value.deleteRateThreshold,
      format: (v) => `${(v * 100).toFixed(1)}%`,
    },
    {
      label: "验证吊销率",
      value: value.revokeRate,
      threshold: value.revokeRateThreshold,
      format: (v) => `${(v * 100).toFixed(1)}%`,
    },
  ]

  return (
    <SolidCard variant="elevated" className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        守门(破线 = 暂缓拉新)
      </p>
      <h2 className="mt-1 text-base font-semibold text-foreground">反向约束指标</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {rows.map((row) => {
          const breached =
            row.value !== null && row.value > row.threshold
          return (
            <div
              key={row.label}
              className={`rounded-2xl border p-3 ${
                breached ? "border-destructive bg-risk-surface" : "border-border bg-muted"
              }`}
            >
              <p className="text-xs text-muted-foreground">{row.label}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {row.value === null ? "—" : row.format(row.value)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                阈值 {row.format(row.threshold)}
                {breached ? " · 破线" : ""}
              </p>
            </div>
          )
        })}
      </div>
    </SolidCard>
  )
}

function FunnelGrowthSection({ value }: { value: FunnelGrowth }) {
  return (
    <FunnelCard
      title="增长漏斗"
      subtitle="近 30 天"
      rows={[
        { label: "邀请落地页 UV", v: value.invitePageViews },
        { label: "注册", v: value.registrations },
        { label: "L1 验证", v: value.l1Verifications },
        { label: "L2 验证", v: value.l2Verifications },
        { label: "首次发布", v: value.firstReviews },
        { label: "首次发出邀请", v: value.firstInvites },
      ]}
      rates={[
        { label: "落地 → 注册", v: value.landingToRegisterRate },
        { label: "注册 → L1", v: value.registerToL1Rate },
        { label: "注册 → L2", v: value.registerToL2Rate },
        { label: "K 因子(估值)", v: value.kFactor, format: (v) => v.toFixed(2) },
      ]}
    />
  )
}

function FunnelIdentitySection({ value }: { value: FunnelIdentity }) {
  return (
    <FunnelCard
      title="身份漏斗"
      subtitle="近 30 天"
      rows={[
        { label: "注册", v: value.registrations },
        { label: "任意等级验证", v: value.anyVerification },
        { label: "L1", v: value.l1Verifications },
        { label: "L2", v: value.l2Verifications },
      ]}
      rates={[
        { label: "注册 → 任意验证", v: value.registerToAnyRate, target: 0.6 },
        { label: "注册 → L1", v: value.registerToL1Rate, target: 0.4 },
        { label: "验证 → L2", v: value.verifyToL2Rate, target: 0.25 },
      ]}
    />
  )
}

function FunnelContentSection({ value }: { value: FunnelContent }) {
  return (
    <FunnelCard
      title="内容漏斗"
      subtitle="L2 用户 · 近 30 天"
      rows={[
        { label: "L2 用户总数", v: value.l2Users },
        { label: "L2 发布过", v: value.l2UsersPublished },
        { label: "L2 被感谢过", v: value.l2UsersWithUseful },
        { label: "L2 发布 ≥2", v: value.l2UsersPublishedTwo },
      ]}
      rates={[
        { label: "L2 → 首条评价", v: value.publishRate, target: 0.4 },
        { label: "评价 → 被感谢", v: value.usefulRate, target: 0.6 },
        { label: "首条 → 第二条", v: value.secondPublishRate, target: 0.5 },
      ]}
    />
  )
}

function FunnelCard({
  title,
  subtitle,
  rows,
  rates,
}: {
  title: string
  subtitle: string
  rows: { label: string; v: number }[]
  rates: { label: string; v: number | null; target?: number; format?: (v: number) => string }[]
}) {
  return (
    <SolidCard variant="subtle" className="p-5">
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <ul className="mt-3 space-y-1.5 text-sm">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-semibold text-foreground">{row.v.toLocaleString()}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">转化率</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {rates.map((rate) => {
            const display = rate.v === null ? "—" : (rate.format ?? ((v) => `${(v * 100).toFixed(1)}%`))(rate.v)
            const meetsTarget = rate.target !== undefined && rate.v !== null && rate.v >= rate.target
            return (
              <li key={rate.label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{rate.label}</span>
                <span
                  className={
                    rate.target === undefined
                      ? "font-semibold text-foreground"
                      : meetsTarget
                        ? "font-semibold text-primary-deep"
                        : "font-semibold text-destructive"
                  }
                >
                  {display}
                  {rate.target !== undefined ? (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      (≥{(rate.target * 100).toFixed(0)}%)
                    </span>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </SolidCard>
  )
}

// ---------------------------------------------------------------------------
// M2 出口(09 §4)
// ---------------------------------------------------------------------------

function M2ExitSection({ value }: { value: M2ExitKpi }) {
  return (
    <SolidCard variant="elevated" className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        M2 出口(09 §4)
      </p>
      <h2 className="mt-1 text-base font-semibold text-foreground">
        离 ship M2 还有多远
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        4 个硬指标中,代码可量化的是 MAU / K 因子 / 拍卖场次与场均人数 / 分享卡渲染数。媒体报道与破圈走运营数据。
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ExitRow
          label="MAU 7 天"
          current={value.mau7}
          target={value.mau7Target}
          format={(v) => v.toLocaleString()}
        />
        <ExitRow
          label="MAU 30 天"
          current={value.mau30}
          target={value.mau30Target}
          format={(v) => v.toLocaleString()}
        />
        <ExitRow
          label="K 因子"
          current={value.kFactor ?? 0}
          target={value.kFactorTarget}
          format={(v) => v.toFixed(2)}
          unmet={value.kFactor === null}
        />
        <ExitRow
          label="拍卖总场次"
          current={value.auctionsTotal}
          target={value.auctionsTarget}
          format={(v) => `${v} / ${value.auctionsTarget}`}
        />
        <ExitRow
          label="拍卖场均出价"
          current={value.auctionAvgBids ?? 0}
          target={value.auctionAvgBidsTarget}
          format={(v) => v.toFixed(1)}
          unmet={value.auctionAvgBids === null}
        />
        <ExitRow
          label="分享卡渲染(破圈代理)"
          current={value.shareCardsRendered}
          target={value.shareCardsTarget}
          format={(v) => `${v} 次(真实破圈走运营录入)`}
        />
      </div>
    </SolidCard>
  )
}

function ExitRow({
  label,
  current,
  target,
  format,
  unmet,
}: {
  label: string
  current: number
  target: number
  format: (v: number) => string
  unmet?: boolean
}) {
  const ratio = target > 0 ? current / target : 0
  const meets = current >= target
  const pct = Math.min(100, Math.round(ratio * 100))
  return (
    <div
      className={`rounded-2xl border p-3 ${
        meets ? "border-primary bg-primary-tint" : "border-border bg-muted"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">
        {unmet ? "—" : format(current)}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        目标 {format(target)} · {meets ? "✓" : `${pct}%`}
      </p>
    </div>
  )
}

"use client"

import Link from "next/link"
import React, { useEffect, useState } from "react"
import {
  Award,
  BadgeCheck,
  Bookmark,
  ChevronRight,
  Flame,
  Lock,
  LogIn,
  Navigation,
  ShieldAlert,
  ShieldCheck,
  Star,
  Ticket,
  Copy,
  Check,
} from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { getFavoritedCompanyIds } from "@/lib/favorites-storage"
import { getMeDashboard } from "@/lib/api/me"
import { IdentityCard, type IdentityCardData } from "@/components/identity/identity-card"

// Types matching /api/me response contract
type DailyTask = {
  id: string
  title: string
  rewardPoints: number
  progress: number
  target: number
  completed: boolean
  href?: string
  hint?: string
}

type Badge = {
  id: string
  name: string
  description: string
  unlocked: boolean
  progress?: number
  target?: number
}

type MyReview = {
  id: string
  companyId: string
  companyName: string
  title: string
  score: number
  shortComment: string
  helpful: number
  commentCount: number
  createdAt: string
}

type FavoriteCompany = {
  companyId: string
  companyName: string
  createdAt: string
}

type VerificationSummary = {
  id: string
  companyName: string
  proofType: string
  status: string
  createdAt: string
}

type InviteItem = {
  id: string
  code: string
  status: string
  createdAt: string
}

type InviteStats = {
  total: number
  used: number
  unused: InviteItem[]
}

type DashboardUser = {
  id: string
  displayName: string
  role: string
  trustLevel: number
  reputationScore: number
  jobBand?: string | null
  yearsOfExperience?: number | null
  companyName?: string | null
  highlightMoment?: string | null
  declinedOffer?: string | null
  inviterName?: string | null
  usefulCount?: number
}

type DashboardData = {
  user: DashboardUser | null
  stats: { directionPoints: number; nextLevelPoints: number; streakDays: number; helpedCount: number }
  dailyTasks: DailyTask[]
  badges: Badge[]
  myReviews: MyReview[]
  favoriteCompanies: FavoriteCompany[]
  verifications: VerificationSummary[]
  invites: InviteStats
}

// Fallback values when API not available yet
const DEFAULT_STATS = { directionPoints: 0, nextLevelPoints: 100, streakDays: 0, helpedCount: 0 }
const DEFAULT_TASKS: DailyTask[] = [
  { id: "task-read-review", title: "阅读一篇点评", rewardPoints: 5, progress: 0, target: 1, completed: false, href: "/search", hint: "帮助他人做出更好的选择" },
  { id: "task-write-review", title: "撰写一篇公司点评", rewardPoints: 20, progress: 0, target: 1, completed: false, hint: "分享你的职场经验" },
  { id: "task-useful-vote", title: "对 3 篇点评点有帮助", rewardPoints: 10, progress: 0, target: 3, completed: false, hint: "发现有价值的点评" },
  { id: "task-complete-profile", title: "完善个人资料", rewardPoints: 15, progress: 0, target: 1, completed: false, hint: "让社区更了解你" },
  { id: "task-invite-friend", title: "邀请好友加入指路人", rewardPoints: 30, progress: 0, target: 1, completed: false, hint: "分享指路人给他人" },
]
const DEFAULT_BADGES: Badge[] = [
  { id: "badge-first-review", name: "初来乍到", description: "撰写第一篇公司点评", unlocked: false, progress: 0, target: 1 },
  { id: "badge-review-5", name: "点评新星", description: "累计撰写 5 篇点评", unlocked: false, progress: 0, target: 5 },
  { id: "badge-review-20", name: "资深指路人", description: "累计撰写 20 篇点评", unlocked: false, progress: 0, target: 20 },
  { id: "badge-helpful-10", name: "慧眼识珠", description: "累计给 10 篇点评点有帮助", unlocked: false, progress: 0, target: 10 },
  { id: "badge-helpful-50", name: "伯乐之眼", description: "累计给 50 篇点评点有帮助", unlocked: false, progress: 0, target: 50 },
  { id: "badge-streak-7", name: "连续 7 天", description: "连续 7 天完成每日任务", unlocked: false, progress: 0, target: 7 },
  { id: "badge-streak-30", name: "坚持不懈", description: "连续 30 天完成每日任务", unlocked: false, progress: 0, target: 30 },
  { id: "badge-trust-level-2", name: "信任新星", description: "信任等级达到 2 级", unlocked: false, progress: 0, target: 2 },
  { id: "badge-trust-level-5", name: "值得信赖", description: "信任等级达到 5 级", unlocked: false, progress: 0, target: 5 },
  { id: "badge-early-adopter", name: "先驱者", description: "在产品早期加入指路人", unlocked: false },
]

export default function MePage() {
  const { user: authUser, loading: authLoading } = useAuth()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [extraFavoriteIds, setExtraFavoriteIds] = useState<string[]>([])

  // Hydrate client-only state (localStorage) after mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExtraFavoriteIds(getFavoritedCompanyIds())
    setHydrated(true)
  }, [])

  // Fetch dashboard data when auth user is available
  useEffect(() => {
    if (authLoading) return

    if (!authUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading after auth resolves to "no user"
      setDashboardLoading(false)
      return
    }

    let cancelled = false
    setDashboardLoading(true)
    setDashboardError(null)

    async function load() {
      const result = await getMeDashboard()
      if (cancelled) return

      if (result.loading || result.error) {
        setDashboardError(result.error ?? "加载失败")
        setDashboardLoading(false)
        return
      }

      if (result.data) {
        setDashboard(result.data)
      }
      setDashboardLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [authUser, authLoading])

  // ── Not logged in ──────────────────────────────────────────────────────
  if (!authLoading && !authUser) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-20">
        <SolidCard variant="elevated" className="w-full max-w-card p-10 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-muted">
            <Navigation className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">登录司南</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            登录后查看方向值、连续点灯和指路等级
            <br />
            匿名保护,不向公司开放身份
          </p>
          <SolidButton asChild variant="primary" size="lg" className="mt-6 w-full">
            <Link href="/login">
              <LogIn className="size-4" />
              登录 / 注册
            </Link>
          </SolidButton>
        </SolidCard>
      </section>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (authLoading || dashboardLoading) {
    // Skeleton mirrors the final layout's shape: hero, 3 metric
    // cards, 2 wide sections (tasks + badges, side by side),
    // 3 review rows. CLS = 0 when the data lands.
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="size-12 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
            <div className="h-3.5 w-48 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-[28px] bg-muted" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-48 animate-pulse rounded-3xl bg-muted" />
          <div className="h-48 animate-pulse rounded-3xl bg-muted" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </section>
    )
  }

  // ── Error fallback ─────────────────────────────────────────────────────
  if (dashboardError && !dashboard) {
    // Use static defaults so page still renders
    const stats = DEFAULT_STATS
    const dailyTasks = DEFAULT_TASKS
    const badges = DEFAULT_BADGES
    const myReviews: MyReview[] = []
    const favoriteCompanies: FavoriteCompany[] = []

    const displayName = authUser?.displayName ?? "指路人"
    const trustLevel = authUser?.trustLevel ?? 0

    const favoriteSet = new Set<string>(extraFavoriteIds)

    return (
      <MeContent
        displayName={displayName}
        trustLevel={trustLevel}
        stats={stats}
        dailyTasks={dailyTasks}
        myReviews={myReviews}
        badges={badges}
        favoriteCompanies={favoriteCompanies}
        favoriteSet={favoriteSet}
        hydrated={hydrated}
      invites={{ total: 0, used: 0, unused: [] }}
      identity={{ displayName, trustLevel }}
      />
    )
  }

  // ── Logged in ──────────────────────────────────────────────────────────
  if (!dashboard) return null

  const stats = dashboard.stats ?? DEFAULT_STATS
  const dailyTasks = dashboard.dailyTasks?.length ? dashboard.dailyTasks : DEFAULT_TASKS
  const badges = dashboard.badges?.length ? dashboard.badges : DEFAULT_BADGES
  const myReviews = dashboard.myReviews ?? []
  const favoriteCompanies = dashboard.favoriteCompanies ?? []
  const verifications = dashboard.verifications ?? []
  const invites = dashboard.invites ?? { total: 0, used: 0, unused: [] }

  const displayName = dashboard.user?.displayName ?? authUser?.displayName ?? "指路人"
  const trustLevel = dashboard.user?.trustLevel ?? authUser?.trustLevel ?? 0

  // Merge API favorites with localStorage favorites
  const allFavoriteIds = new Set([
    ...favoriteCompanies.map((f) => f.companyId),
    ...extraFavoriteIds,
  ])
  const favoriteSet = allFavoriteIds

  return (
    <MeContent
      displayName={displayName}
      trustLevel={trustLevel}
      stats={stats}
      dailyTasks={dailyTasks}
      myReviews={myReviews}
      badges={badges}
      favoriteCompanies={favoriteCompanies}
      favoriteSet={favoriteSet}
      hydrated={hydrated}
      extraFavoriteIds={extraFavoriteIds}
      verifications={verifications}
      invites={invites}
      identity={{
        displayName,
        trustLevel,
        companyName: dashboard.user?.companyName ?? undefined,
        jobBand: dashboard.user?.jobBand ?? undefined,
        yearsOfExperience: dashboard.user?.yearsOfExperience ?? undefined,
        reputationScore: dashboard.user?.reputationScore ?? 0,
        usefulCount: dashboard.user?.usefulCount ?? 0,
        highlightMoment: dashboard.user?.highlightMoment ?? undefined,
        declinedOffer: dashboard.user?.declinedOffer ?? undefined,
        inviterName: dashboard.user?.inviterName ?? undefined,
      }}
    />
  )
}

// ── Shared rendering component ───────────────────────────────────────────

type MeContentProps = {
  displayName: string
  trustLevel: number
  stats: { directionPoints: number; nextLevelPoints: number; streakDays: number; helpedCount: number }
  dailyTasks: DailyTask[]
  myReviews: MyReview[]
  badges: Badge[]
  favoriteCompanies: FavoriteCompany[]
  favoriteSet: Set<string>
  hydrated: boolean
  extraFavoriteIds?: string[]
  verifications?: VerificationSummary[]
  invites?: InviteStats
  identity: IdentityCardData
}

const VERIFICATION_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  approved: { label: "已认证", icon: <ShieldCheck className="size-3.5" />, color: "text-primary" },
  submitted: { label: "待审核", icon: <ShieldAlert className="size-3.5" />, color: "text-muted-foreground" },
  reviewing: { label: "审核中", icon: <ShieldAlert className="size-3.5" />, color: "text-muted-foreground" },
  rejected: { label: "已拒绝", icon: <ShieldAlert className="size-3.5" />, color: "text-destructive" },
  revoked: { label: "已失效", icon: <ShieldAlert className="size-3.5" />, color: "text-destructive" },
}

const PROOF_LABELS: Record<string, string> = {
  work_email: "企业邮箱",
  business_document: "在职证明",
  salary_proof: "薪资流水",
}

function MeContent({
  displayName,
  trustLevel,
  stats,
  dailyTasks,
  myReviews,
  badges,
  favoriteCompanies,
  favoriteSet,
  hydrated,
  extraFavoriteIds = [],
  verifications = [],
  invites = { total: 0, used: 0, unused: [] },
  identity,
}: MeContentProps) {
  const [favoritesOpen, setFavoritesOpen] = useState(false)
  const [badgesOpen, setBadgesOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [cardData, setCardData] = useState(identity)

  function copyCode(code: string) {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${code}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    })
  }

  const levelGap = stats.nextLevelPoints - stats.directionPoints
  const levelProgress = stats.nextLevelPoints > 0
    ? Math.round((stats.directionPoints / stats.nextLevelPoints) * 100)
    : 0
  const isNewUser = stats.directionPoints === 0 && stats.helpedCount === 0 && myReviews.length === 0
  const visibleTasks = isNewUser ? dailyTasks.slice(0, 2) : dailyTasks

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">我的</h1>
          <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
            <span>{displayName}</span>
            <span>{trustLevel > 0 ? "身份已核验" : "身份待核验"}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
          指路人
          <ChevronRight className="size-3.5" />
        </div>
      </div>

      <div className="flex justify-center border-y border-border py-6 sm:justify-start">
        <IdentityCard data={cardData} />
      </div>

      <ProfileEditor
        initial={cardData}
        onSaved={(next) => setCardData((current) => ({ ...current, ...next }))}
      />

      {isNewUser ? (
        <section className="flex flex-col gap-4 border-y border-border py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-prose-sm">
            <h2 className="text-xl font-semibold text-foreground">从一条真实经验开始</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              写下你熟悉的公司，或先阅读一篇评价。完成第一次行动后，这里会展示方向值和社区贡献。
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <SolidButton asChild>
              <Link href="/submit/review">写第一条评价</Link>
            </SolidButton>
            <SolidButton asChild variant="secondary">
              <Link href="/search">先看看公司</Link>
            </SolidButton>
          </div>
        </section>
      ) : (
      <div className="grid gap-4 md:grid-cols-3">
        <SolidCard variant="default" className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-muted">
              <Navigation className="size-4 text-secondary-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">方向值</span>
          </div>
          <p className="text-3xl font-semibold text-foreground" data-testid="me-direction-points">
            {stats.directionPoints}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">距离下一阶段还差 {levelGap}</p>
          <Progress value={levelProgress} className="mt-3 h-1.5" />
        </SolidCard>

        <SolidCard variant="default" className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-risk-surface">
              <Flame className="size-4 text-risk" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">连续点灯</span>
          </div>
          <p className="text-3xl font-semibold text-foreground" data-testid="me-streak-days">
            {stats.streakDays} 天
          </p>
          <p className="mt-1 text-xs text-muted-foreground">今天再看 1 条评价即可保持</p>
        </SolidCard>

        <SolidCard variant="default" className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-foreground">
              <Award className="size-4 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">指路等级</span>
          </div>
          <p className="text-3xl font-semibold text-foreground">L{trustLevel}</p>
          <p className="mt-1 text-xs text-muted-foreground">已帮助 {stats.helpedCount} 位后来者</p>
        </SolidCard>
      </div>
      )}

      {/* Verification status */}
      <section className="border-t border-border pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">身份认证</h2>
          <Link
            href="/company-verification"
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
          >
            {verifications.length === 0 ? "去认证 →" : "新增认证 →"}
          </Link>
        </div>
        {verifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
            <BadgeCheck className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">尚未认证</p>
            <p className="mt-1 text-xs text-muted-foreground">
              完成企业邮箱认证，解锁身份卡与邀请名额
            </p>
            <SolidButton asChild variant="secondary" size="sm" className="mt-4">
              <Link href="/company-verification">立即认证</Link>
            </SolidButton>
          </div>
        ) : (
          <div className="space-y-2">
            {verifications.map((v) => {
              const meta = VERIFICATION_LABELS[v.status] ?? VERIFICATION_LABELS.submitted
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{v.companyName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {PROOF_LABELS[v.proofType] ?? v.proofType}
                    </p>
                  </div>
                  <span className={`flex shrink-0 items-center gap-1 text-xs font-medium ${meta.color}`}>
                    {meta.icon}
                    {meta.label}
                  </span>
                </div>
              )
            })}
            {trustLevel === 0 && verifications.every((v) => v.status !== "approved") ? (
              <p className="text-xs text-muted-foreground">认证审核通过后，身份卡将自动解锁。</p>
            ) : null}
          </div>
        )}
      </section>

      {/* Invites */}
      {trustLevel >= 1 && (
        <section className="border-t border-border pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">邀请名额</h2>
            <span className="text-xs text-muted-foreground">
              已用 {invites.used} / 共 {invites.total}
            </span>
          </div>
          {invites.unused.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
              <Ticket className="mx-auto mb-2 size-7 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">暂无可用邀请码</p>
              <p className="mt-1 text-xs text-muted-foreground">
                邀请的朋友完成深度认证后，名额将自动返还（最多 6 个）
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {invites.unused.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Ticket className="size-4 shrink-0 text-primary" />
                    <span className="font-mono text-sm font-semibold tracking-widest text-foreground">
                      {inv.code}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCode(inv.code)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-primary hover:bg-muted transition-colors"
                    aria-label={`复制邀请链接 ${inv.code}`}
                  >
                    {copiedCode === inv.code ? (
                      <><Check className="size-3.5" />已复制</>
                    ) : (
                      <><Copy className="size-3.5" />复制链接</>
                    )}
                  </button>
                </div>
              ))}
              <p className="mt-1 text-xs text-muted-foreground">
                分享邀请链接给认识的职场人，对方注册后你将共同完成认证
              </p>
            </div>
          )}
        </section>
      )}

      {trustLevel === 0 && verifications.some((v) => v.status !== "approved") && (
        <section className="border-t border-border pt-6">
          <div className="flex items-start gap-3 rounded-2xl bg-muted p-4">
            <Ticket className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">完成认证后解锁邀请名额</p>
              <p className="mt-1 text-xs text-muted-foreground">
                企业邮箱认证通过后，你将获得 3 个初始邀请名额。
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Daily tasks */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-foreground">今日指路任务</h2>
        <div className="grid gap-3" data-testid="me-daily-tasks">
          {visibleTasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center justify-between gap-3 rounded-2xl p-4 transition ${
                task.completed
                  ? "bg-muted"
                  : "bg-card border border-border/60"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${task.completed ? "text-secondary-foreground" : "text-foreground"}`}>
                  {task.completed && "✅ "}
                  {task.title}
                </p>
                <p className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                  <span>奖励 +{task.rewardPoints} 方向值</span>
                  <span>进度 {task.progress}/{task.target}</span>
                  {task.hint ? <span>{task.hint}</span> : null}
                </p>
              </div>
              {!task.completed && task.href ? (
                <SolidButton asChild variant="secondary" size="sm">
                  <Link href={task.href}>去完成</Link>
                </SolidButton>
              ) : null}
            </div>
          ))}
        </div>
        {isNewUser && dailyTasks.length > visibleTasks.length ? (
          <p className="mt-3 text-sm text-muted-foreground">完成第一次行动后，将解锁更多日常任务。</p>
        ) : null}
      </section>

      {/* My reviews */}
      <section className="border-t border-border pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">我的评价</h2>
          <Link href="/submit/review" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
            写新评价 →
          </Link>
        </div>
        {myReviews.length === 0 ? (
          <SolidEmptyState
            title="还没有评价"
            description="分享你熟悉的那家公司,帮助更多后来者看清方向。"
            action={
              <SolidButton asChild variant="primary" size="sm">
                <Link href="/submit/review">写第一条评价</Link>
              </SolidButton>
            }
          />
        ) : (
          <div className="grid gap-3" data-testid="me-my-reviews">
            {myReviews.map((review) => (
              <Link
                key={review.id}
                href={`/company/${review.companyId}`}
                className="block rounded-2xl border border-border/60 bg-card p-4 transition hover:border-primary/50 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-foreground">{review.companyName}</p>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <Star className="size-3.5 fill-[#19C37D] text-primary" />
                    {review.score} 分
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-foreground">{review.shortComment}</p>
                <p className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                  <span>有用 {review.helpful}</span>
                  <span>追问 {review.commentCount}</span>
                  <span>{new Date(review.createdAt).toLocaleDateString("zh-CN")}</span>
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My favorites — localStorage hybrid (API favoriteCompanies service not yet implemented).
          Distilled: collapsed by default since most visitors come here for the dashboard,
          not to re-scan their saved companies. Tap to expand. */}
      <section className="border-t border-border py-2">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between text-left"
          onClick={() => setFavoritesOpen((v) => !v)}
          aria-expanded={favoritesOpen}
          aria-controls="me-my-favorites"
          data-testid="me-toggle-favorites"
        >
          <h2 className="text-base font-semibold text-foreground">我的收藏</h2>
          <span className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="me-favorites-count">
            共 {favoriteSet.size} 家公司
            <ChevronRight
              className={`size-3.5 transition-transform ${favoritesOpen ? "rotate-90" : ""}`}
            />
          </span>
        </button>
        {favoritesOpen ? (
          <div id="me-my-favorites" className="mt-4">
            {favoriteSet.size === 0 && hydrated ? (
              <SolidEmptyState
                title="还没有收藏公司"
                description="在任意公司详情页点 ☆,这里会汇总你关注的公司方向变化。"
                action={
                  <SolidButton asChild variant="secondary" size="sm">
                    <Link href="/search">去发现公司</Link>
                  </SolidButton>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2" data-testid="me-my-favorites">
                {favoriteCompanies.map((fav) => (
                  <Link
                    key={fav.companyId}
                    href={`/company/${fav.companyId}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 transition hover:border-primary/50 hover:bg-white"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{fav.companyName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">已收藏公司</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-primary">
                      <Bookmark className="size-4 fill-current" />
                    </div>
                  </Link>
                ))}
                {extraFavoriteIds
                  .filter((id) => !favoriteCompanies.some((f) => f.companyId === id))
                  .map((id) => (
                    <div key={id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4">
                      <p className="truncate text-sm font-semibold text-foreground">{id}</p>
                      <div className="flex shrink-0 items-center gap-1 text-primary">
                        <Bookmark className="size-4 fill-current" />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* Badges — also distilled (collapsed by default, summary count visible). */}
      <section className="border-t border-border py-2">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between text-left"
          onClick={() => setBadgesOpen((v) => !v)}
          aria-expanded={badgesOpen}
          aria-controls="me-badges-list"
          data-testid="me-toggle-badges"
        >
          <h2 className="text-base font-semibold text-foreground">司南徽章</h2>
          <span className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="me-badges-progress">
            {badges.filter((b) => b.unlocked).length} / {badges.length} 已解锁
            <ChevronRight
              className={`size-3.5 transition-transform ${badgesOpen ? "rotate-90" : ""}`}
            />
          </span>
        </button>
        {badgesOpen ? (
          <div id="me-badges-list" className="mt-4 grid gap-2" data-testid="me-badges-list">
            {badges.map((badge) => {
              const progress = badge.progress ?? badge.target ?? 0
              const target = badge.target ?? 0
              const ratio = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : badge.unlocked ? 100 : 0
              return (
                <div
                  key={badge.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${
                    badge.unlocked ? "bg-muted" : "bg-card border border-border/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-9 items-center justify-center rounded-xl ${
                        badge.unlocked ? "bg-primary-hover text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {badge.unlocked ? <Award className="size-4" /> : <Lock className="size-4" />}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${badge.unlocked ? "text-secondary-foreground" : "text-foreground"}`}>
                        {badge.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                  {!badge.unlocked && target > 0 ? (
                    <div className="min-w-[120px] text-right">
                      <p className="text-xs text-muted-foreground">
                        {progress} / {target}
                      </p>
                      <Progress value={ratio} className="mt-1 h-1.5" />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}
      </section>
    </section>
  )
}

function ProfileEditor({
  initial,
  onSaved,
}: {
  initial: IdentityCardData
  onSaved: (data: Partial<IdentityCardData>) => void
}) {
  const [open, setOpen] = useState(false)
  const [jobBand, setJobBand] = useState(initial.jobBand ?? "")
  const [years, setYears] = useState(
    initial.yearsOfExperience == null ? "" : String(initial.yearsOfExperience)
  )
  const [highlight, setHighlight] = useState(initial.highlightMoment ?? "")
  const [declinedOffer, setDeclinedOffer] = useState(initial.declinedOffer ?? "")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage("")
    try {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobBand: jobBand.trim() || null,
          yearsOfExperience: years === "" ? null : Number(years),
          highlightMoment: highlight.trim() || null,
          declinedOffer: declinedOffer.trim() || null,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "保存失败")
      onSaved({
        jobBand: jobBand.trim() || undefined,
        yearsOfExperience: years === "" ? undefined : Number(years),
      })
      setMessage(
        result.pendingReview?.length
          ? "基础资料已保存，高光与拒绝陈列将在审核后展示"
          : "资料已保存"
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="border-b border-border pb-6">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block text-sm font-semibold text-foreground">身份资料</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            高光与拒绝陈列审核通过后公开
          </span>
        </span>
        <ChevronRight className={`size-4 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open ? (
        <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-foreground">
            职级带
            <input
              value={jobBand}
              onChange={(event) => setJobBand(event.target.value)}
              maxLength={40}
              placeholder="例如 P7 / VP"
              className="mt-1.5 h-11 w-full border border-input bg-card px-3 font-normal outline-none focus-visible:border-ring"
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            工作年限
            <input
              type="number"
              min={0}
              max={60}
              value={years}
              onChange={(event) => setYears(event.target.value)}
              className="mt-1.5 h-11 w-full border border-input bg-card px-3 font-normal outline-none focus-visible:border-ring"
            />
          </label>
          <label className="text-sm font-medium text-foreground sm:col-span-2">
            高光时刻
            <input
              value={highlight}
              onChange={(event) => setHighlight(event.target.value)}
              maxLength={120}
              placeholder="一件能代表你判断力或执行力的事"
              className="mt-1.5 h-11 w-full border border-input bg-card px-3 font-normal outline-none focus-visible:border-ring"
            />
          </label>
          <label className="text-sm font-medium text-foreground sm:col-span-2">
            拒绝陈列
            <input
              value={declinedOffer}
              onChange={(event) => setDeclinedOffer(event.target.value)}
              maxLength={120}
              placeholder="例如：拒绝某大厂高薪，选择创业"
              className="mt-1.5 h-11 w-full border border-input bg-card px-3 font-normal outline-none focus-visible:border-ring"
            />
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <SolidButton type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存资料"}
            </SolidButton>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </div>
        </form>
      ) : null}
    </section>
  )
}

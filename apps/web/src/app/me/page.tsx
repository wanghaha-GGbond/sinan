"use client"

import Link from "next/link"
import React, { useEffect, useRef, useState } from "react"
import {
  Award,
  BadgeCheck,
  Bookmark,
  ChevronRight,
  Lock,
  LogIn,
  LogOut,
  Navigation,
  ShieldAlert,
  ShieldCheck,
  Star,
  Ticket,
  Copy,
  Check,
} from "lucide-react"

import { WebButton } from "@/components/ui/web-button"
import { WebSurface } from "@/components/ui/web-surface"
import { WebEmptyState } from "@/components/ui/web-empty-state"
import { SessionUnavailable } from "@/components/common/session-unavailable"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { getFavoritedCompanyIds } from "@/lib/favorites-storage"
import { getMeDashboard } from "@/lib/api/me"
import type { MyReview, MyReviewPage } from "@/lib/my-reviews"
import { IdentityCard, type IdentityCardData } from "@/components/identity/identity-card"
import { MyWorkRecords, useWorkRecordsRequested } from "@/components/pulse/my-work-records"
import { dialogueEnabled } from "@/lib/dialogue-feature"
import { pointsEnabled } from "@/lib/points"
import { withNext } from "@/lib/navigation"
import { isPulseEnabled } from "@/lib/pulse-feature"

const pulseEnabled = isPulseEnabled({
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_PULSE_ENABLED: process.env.NEXT_PUBLIC_PULSE_ENABLED,
})

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
  myReviewsNextCursor?: string | null
  favoriteCompanies: FavoriteCompany[]
  verifications: VerificationSummary[]
  invites: InviteStats
}

// Fallback values when API not available yet
const DEFAULT_TASKS: DailyTask[] = []
const DEFAULT_BADGES: Badge[] = []

export default function MePage() {
  const workRecordsRequested = useWorkRecordsRequested()
  const { user: authUser, loading: authLoading, sessionUnavailable } = useAuth()
  const [snapshot, setSnapshot] = useState<{ owner: string; data: DashboardData } | null>(null)
  const dashboard = snapshot && snapshot.owner === authUser?.id ? snapshot.data : null
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

    const owner = authUser.id
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
        setSnapshot({ owner, data: result.data })
      }
      setDashboardLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [authUser, authLoading])

  if (!authLoading && sessionUnavailable && !authUser) return <SessionUnavailable />

  // ── Not logged in ──────────────────────────────────────────────────────
  if (!authLoading && !authUser) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">我的</h1>
        <WebSurface variant="elevated" className="mx-auto w-full max-w-card p-8 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-muted">
            <Navigation className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">登录在场</h2>
          <WebButton asChild variant="primary" size="lg" className="mt-6 w-full">
            <Link href={withNext("/login", workRecordsRequested ? "/me#work-records" : "/me")}>
              <LogIn className="size-4" />
              {workRecordsRequested ? "登录后记录今天" : "登录 / 注册"}
            </Link>
          </WebButton>
        </WebSurface>
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

  // ── Deployed API failure ───────────────────────────────────────────────
  if (dashboardError && !dashboard) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-20">
        <WebSurface variant="elevated" className="w-full max-w-card p-10 text-center">
          <h2 className="text-lg font-semibold text-foreground">账户信息暂时无法加载</h2>
          <WebButton
            type="button"
            variant="primary"
            size="lg"
            className="mt-6 w-full"
            onClick={() => window.location.reload()}
          >
            重试
          </WebButton>
        </WebSurface>
      </section>
    )
  }

  // ── Logged in ──────────────────────────────────────────────────────────
  if (!dashboard) return null

  const dailyTasks = dashboard.dailyTasks ?? DEFAULT_TASKS
  const badges = dashboard.badges ?? DEFAULT_BADGES
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
      key={authUser?.id}
      displayName={displayName}
      trustLevel={trustLevel}
      dailyTasks={dailyTasks}
      myReviews={myReviews}
      myReviewsNextCursor={dashboard.myReviewsNextCursor ?? null}
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
  dailyTasks: DailyTask[]
  myReviews: MyReview[]
  myReviewsNextCursor: string | null
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
  dailyTasks,
  myReviews,
  myReviewsNextCursor,
  badges,
  favoriteCompanies,
  favoriteSet,
  hydrated,
  extraFavoriteIds = [],
  verifications = [],
  invites = { total: 0, used: 0, unused: [] },
  identity,
}: MeContentProps) {
  const { logout, loggingOut } = useAuth()
  const [favoritesOpen, setFavoritesOpen] = useState(false)
  const [badgesOpen, setBadgesOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [cardData, setCardData] = useState(identity)
  const [olderReviews, setOlderReviews] = useState<MyReview[]>([])
  const [nextCursor, setNextCursor] = useState(myReviewsNextCursor)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [olderError, setOlderError] = useState(false)
  const olderRequest = useRef(false)

  async function loadOlderReviews() {
    if (!nextCursor || olderRequest.current) return
    olderRequest.current = true
    setLoadingOlder(true)
    setOlderError(false)
    try {
      const response = await fetch(`/api/me/reviews?cursor=${encodeURIComponent(nextCursor)}`, { cache: "no-store" })
      if (!response.ok) throw new Error("Page unavailable")
      const page = await response.json() as MyReviewPage
      if (!Array.isArray(page.reviews) || (page.nextCursor !== null && typeof page.nextCursor !== "string") || page.nextCursor === nextCursor) {
        throw new Error("Invalid review page")
      }
      setOlderReviews(previous => {
        const seen = new Set([...myReviews, ...previous].map(review => review.id))
        return [...previous, ...page.reviews.filter(review => !seen.has(review.id))]
      })
      setNextCursor(page.nextCursor)
    } catch {
      setOlderError(true)
    } finally {
      olderRequest.current = false
      setLoadingOlder(false)
    }
  }

  function copyCode(code: string) {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${code}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    })
  }

  const isNewUser = myReviews.length === 0
  const visibleTasks = isNewUser ? dailyTasks.slice(0, 2) : dailyTasks

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">个人主页</h1>
          <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
            <span>{cardData.displayName ?? displayName}</span>
            <span>{trustLevel > 0 ? "身份已核验" : "身份待核验"}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <WebButton asChild variant="secondary" size="sm"><Link href="/settings/account">账号与数据</Link></WebButton>
          <WebButton type="button" variant="ghost" size="sm" disabled={loggingOut} onClick={() => void logout()} aria-label="退出登录">
            <LogOut className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">退出</span>
          </WebButton>
        </div>
      </div>

      {pulseEnabled ? <MyWorkRecords /> : null}
      <nav aria-label="我的社区" className="flex flex-wrap gap-2 text-sm">
        <WebButton asChild variant="secondary"><Link href="/community?feed=mine">我的帖子</Link></WebButton>
        <WebButton asChild variant="secondary"><Link href="/community?feed=following">关注的公司动态</Link></WebButton>
        {dialogueEnabled({ NEXT_PUBLIC_DIALOGUE_ENABLED: process.env.NEXT_PUBLIC_DIALOGUE_ENABLED }) ? <WebButton asChild variant="secondary"><Link href="/me/dialogues">我的对话报名</Link></WebButton> : null}
        {pointsEnabled() ? <WebButton asChild variant="secondary"><Link href="/me/points">积分与任务</Link></WebButton> : null}
      </nav>

      <div className="flex justify-center border-y border-border py-6 sm:justify-start">
        <IdentityCard data={cardData} />
      </div>

      <ProfileEditor
        key={identity.displayName}
        initial={cardData}
        onSaved={(next) => setCardData((current) => ({ ...current, ...next }))}
      />

      <nav aria-label="个人功能" className="flex flex-wrap gap-2 border-b border-border pb-5">
        <WebButton asChild variant="secondary"><Link href="#my-reviews">我的评价</Link></WebButton>
        <WebButton asChild variant="secondary"><Link href="/me/skills">我的技能</Link></WebButton>
        <WebButton asChild variant="secondary"><Link href="/me/highlights">我的高光</Link></WebButton>
        <WebButton asChild variant="secondary"><Link href="/company-verification">身份认证</Link></WebButton>
      </nav>

      {isNewUser ? (
        <section className="flex flex-col gap-4 border-y border-border py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-prose-sm">
            <h2 className="text-xl font-semibold text-foreground">我的评价</h2>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <WebButton asChild>
              <Link href="/submit/review">写第一条评价</Link>
            </WebButton>
            <WebButton asChild variant="secondary">
              <Link href="/search">先看看公司</Link>
            </WebButton>
          </div>
        </section>
      ) : null}

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
            <WebButton asChild variant="secondary" size="sm" className="mt-4">
              <Link href="/company-verification">立即认证</Link>
            </WebButton>
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
      {dailyTasks.length > 0 ? (<section>
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
                <WebButton asChild variant="secondary" size="sm">
                  <Link href={task.href}>去完成</Link>
                </WebButton>
              ) : null}
            </div>
          ))}
        </div>
        {isNewUser && dailyTasks.length > visibleTasks.length ? (
          <p className="mt-3 text-sm text-muted-foreground">完成第一次行动后，将解锁更多日常任务。</p>
        ) : null}
      </section>) : null}

      {/* My reviews */}
      <section className="border-t border-border pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="my-reviews" className="text-base font-semibold text-foreground">我的评价</h2>
          <Link href="/submit/review" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
            写新评价 →
          </Link>
        </div>
        {myReviews.length === 0 ? (
          <WebEmptyState
            title="还没有评价"
            action={
              <WebButton asChild variant="primary" size="sm">
                <Link href="/submit/review">写第一条评价</Link>
              </WebButton>
            }
          />
        ) : (
          <div className="grid gap-3" data-testid="me-my-reviews">
            {[...myReviews, ...olderReviews].map((review) => (
              <Link
                key={review.id}
                href={`/company/${review.companyId}`}
                className="block rounded-2xl border border-border/60 bg-card p-4 transition hover:border-primary/50 hover:bg-muted-hover"
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
            {olderError ? <p role="alert" className="text-sm text-destructive">更早的评价暂时无法加载。</p> : null}
            {nextCursor ? (
              <WebButton variant="secondary" disabled={loadingOlder} onClick={() => void loadOlderReviews()}>
                {loadingOlder ? "正在加载…" : olderError ? "重试加载更早评价" : "加载更早评价"}
              </WebButton>
            ) : null}
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
              <WebEmptyState
                title="还没有收藏公司"
                action={
                  <WebButton asChild variant="secondary" size="sm">
                    <Link href="/search">去发现公司</Link>
                  </WebButton>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2" data-testid="me-my-favorites">
                {favoriteCompanies.map((fav) => (
                  <Link
                    key={fav.companyId}
                    href={`/company/${fav.companyId}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 transition hover:border-primary/50 hover:bg-muted-hover"
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
      {badges.length > 0 ? (<section className="border-t border-border py-2">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between text-left"
          onClick={() => setBadgesOpen((v) => !v)}
          aria-expanded={badgesOpen}
          aria-controls="me-badges-list"
          data-testid="me-toggle-badges"
        >
          <h2 className="text-base font-semibold text-foreground">在场徽章</h2>
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
      </section>) : null}
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
  const [displayName, setDisplayName] = useState(initial.displayName ?? "")
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
          displayName: displayName.trim(),
          jobBand: jobBand.trim() || null,
          yearsOfExperience: years === "" ? null : Number(years),
          highlightMoment: highlight.trim() || null,
          declinedOffer: declinedOffer.trim() || null,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "保存失败")
      onSaved({
        displayName: displayName.trim(),
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
          <span className="block text-sm font-semibold text-foreground">编辑个人资料</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            高光与拒绝陈列审核通过后公开
          </span>
        </span>
        <ChevronRight className={`size-4 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open ? (
        <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-foreground sm:col-span-2">
            昵称
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={40} required
              className="mt-1.5 h-11 w-full border border-input bg-card px-3 font-normal outline-none focus-visible:border-ring" />
          </label>
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
            <WebButton type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存资料"}
            </WebButton>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </div>
        </form>
      ) : null}
    </section>
  )
}

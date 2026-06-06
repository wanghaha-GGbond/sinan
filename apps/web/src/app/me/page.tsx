"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Award,
  Bookmark,
  ChevronRight,
  Flame,
  Lock,
  LogIn,
  Navigation,
  Star,
} from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { getFavoritedCompanyIds } from "@/lib/favorites-storage"
import { getMeDashboard } from "@/lib/api/me"

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

type DashboardData = {
  user: { id: string; displayName: string; role: string; trustLevel: number } | null
  stats: { directionPoints: number; nextLevelPoints: number; streakDays: number; helpedCount: number }
  dailyTasks: DailyTask[]
  badges: Badge[]
  myReviews: MyReview[]
  favoriteCompanies: FavoriteCompany[]
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
        <SolidCard variant="elevated" className="w-full max-w-[420px] p-10 text-center">
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
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-[28px] bg-muted" />
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
}: MeContentProps) {
  const [favoritesOpen, setFavoritesOpen] = useState(false)
  const [badgesOpen, setBadgesOpen] = useState(false)

  const levelGap = stats.nextLevelPoints - stats.directionPoints
  const levelProgress = stats.nextLevelPoints > 0
    ? Math.round((stats.directionPoints / stats.nextLevelPoints) * 100)
    : 0

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">我的</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {displayName} · 指路等级 L{trustLevel}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
          指路人
          <ChevronRight className="size-3.5" />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <SolidCard variant="default" className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary-tint">
              <Navigation className="size-4 text-secondary-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">方向值</span>
          </div>
          <p className="text-3xl font-semibold text-foreground" data-testid="me-direction-points">
            {stats.directionPoints}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">距离 L{trustLevel + 1} 还差 {levelGap}</p>
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

      {/* Daily tasks */}
      <SolidCard variant="default" className="p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">今日指路任务</h2>
        <div className="grid gap-3" data-testid="me-daily-tasks">
          {dailyTasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center justify-between gap-3 rounded-2xl p-4 transition ${
                task.completed
                  ? "bg-primary-tint"
                  : "bg-card border border-border/60"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${task.completed ? "text-secondary-foreground" : "text-foreground"}`}>
                  {task.completed && "✅ "}
                  {task.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  奖励 +{task.rewardPoints} 方向值 · 进度 {task.progress}/{task.target}
                  {task.hint ? ` · ${task.hint}` : ""}
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
      </SolidCard>

      {/* My reviews */}
      <SolidCard variant="default" className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">我的评价</h2>
          <Link href="/submit/review" className="text-sm font-medium text-primary hover:underline">
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
                <p className="mt-2 text-xs text-muted-foreground">
                  有用 {review.helpful} · 追问 {review.commentCount} · {new Date(review.createdAt).toLocaleDateString("zh-CN")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </SolidCard>

      {/* My favorites — localStorage hybrid (API favoriteCompanies service not yet implemented).
          Distilled: collapsed by default since most visitors come here for the dashboard,
          not to re-scan their saved companies. Tap to expand. */}
      <SolidCard variant="default" className="p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
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
      </SolidCard>

      {/* Badges — also distilled (collapsed by default, summary count visible). */}
      <SolidCard variant="default" className="p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
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
                    badge.unlocked ? "bg-primary-tint" : "bg-card border border-border/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-9 items-center justify-center rounded-xl ${
                        badge.unlocked ? "bg-primary text-white" : "bg-muted text-muted-foreground"
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
      </SolidCard>
    </section>
  )
}
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
import {
  badgeCatalog,
  companies,
  currentUser,
  dailyTasks,
  myFavoriteCompanies,
  myReviews,
} from "@/lib/mock-data"

export default function MePage() {
  // Hooks must run in the same order on every render — declare them all
  // before any conditional return.
  const { user, loading } = useAuth()
  const [hydrated, setHydrated] = useState(false)
  const [extraFavoriteIds, setExtraFavoriteIds] = useState<string[]>([])

  // Hydrate client-only state (localStorage) after mount. localStorage
  // hydration cannot be replaced by useSyncExternalStore without hoisting
  // a global store; the cascading render only happens once.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExtraFavoriteIds(getFavoritedCompanyIds())
    setHydrated(true)
  }, [])

  // ── Not logged in ──────────────────────────────────────────────────────
  if (!loading && !user) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-20">
        <SolidCard variant="elevated" className="w-full max-w-[420px] p-10 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-[#F1F5EF]">
            <Navigation className="size-8 text-[#9CA3AF]" />
          </div>
          <h2 className="text-lg font-semibold text-[#111827]">登录司南</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
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
  if (loading) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-[#F1F5EF]" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-[28px] bg-[#F1F5EF]" />
          ))}
        </div>
      </section>
    )
  }

  // ── Logged in ──────────────────────────────────────────────────────────
  const levelGap = currentUser.nextLevelPoints - currentUser.directionPoints
  const levelProgress = Math.round((currentUser.directionPoints / currentUser.nextLevelPoints) * 100)
  const displayName = user?.displayName ?? "指路人"

  // Merge the mock seed list with the user's localStorage favorited ids so any
  // company they heart on a detail page shows up here too.
  const favoriteSet = new Set([...myFavoriteCompanies.map((c) => c.companyId), ...extraFavoriteIds])
  const myFavoriteList = [
    ...myFavoriteCompanies,
    ...extraFavoriteIds
      .filter((id) => !myFavoriteCompanies.some((c) => c.companyId === id))
      .map((id) => {
        const company = companies.find((c) => c.id === id)
        return company
          ? { companyId: id, companyName: company.shortName, createdAt: new Date().toISOString() }
          : null
      })
      .filter((item): item is { companyId: string; companyName: string; createdAt: string } => item !== null),
  ]

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">我的</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {displayName} · 指路等级 L{currentUser.trustLevel}
          </p>
        </div>
        <Link
          href="/me"
          className="flex items-center gap-1 rounded-full bg-[#F1F5EF] px-4 py-2 text-sm font-medium text-[#6B7280] transition hover:bg-[#E8EEE5]"
        >
          指路人#{user?.id?.slice(0, 6)}
          <ChevronRight className="size-3.5" />
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <SolidCard variant="default" className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#DFF8EC]">
              <Navigation className="size-4 text-[#07563A]" />
            </div>
            <span className="text-sm font-medium text-[#6B7280]">方向值</span>
          </div>
          <p className="text-3xl font-semibold text-[#111827]" data-testid="me-direction-points">
            {currentUser.directionPoints}
          </p>
          <p className="mt-1 text-xs text-[#9CA3AF]">距离 L{currentUser.trustLevel + 1} 还差 {levelGap}</p>
          <Progress value={levelProgress} className="mt-3 h-1.5" />
        </SolidCard>

        <SolidCard variant="default" className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#FFF1D6]">
              <Flame className="size-4 text-[#C76A15]" />
            </div>
            <span className="text-sm font-medium text-[#6B7280]">连续点灯</span>
          </div>
          <p className="text-3xl font-semibold text-[#111827]" data-testid="me-streak-days">
            {currentUser.streakDays} 天
          </p>
          <p className="mt-1 text-xs text-[#9CA3AF]">今天再看 1 条评价即可保持</p>
        </SolidCard>

        <SolidCard variant="default" className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#111827]">
              <Award className="size-4 text-white" />
            </div>
            <span className="text-sm font-medium text-[#6B7280]">指路等级</span>
          </div>
          <p className="text-3xl font-semibold text-[#111827]">L{currentUser.trustLevel}</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">已帮助 {currentUser.helpedCount} 位后来者</p>
        </SolidCard>
      </div>

      {/* Daily tasks */}
      <SolidCard variant="default" className="p-5">
        <h2 className="mb-4 text-base font-semibold text-[#111827]">今日指路任务</h2>
        <div className="grid gap-3" data-testid="me-daily-tasks">
          {dailyTasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center justify-between gap-3 rounded-2xl p-4 transition ${
                task.completed
                  ? "bg-[#DFF8EC]"
                  : "bg-[#F9FAF7] border border-[#E5E7DB]/60"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${task.completed ? "text-[#07563A]" : "text-[#111827]"}`}>
                  {task.completed && "✅ "}
                  {task.title}
                </p>
                <p className="mt-0.5 text-xs text-[#9CA3AF]">
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
          <h2 className="text-base font-semibold text-[#111827]">我的评价</h2>
          <Link href="/submit/review" className="text-sm font-medium text-[#19C37D] hover:underline">
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
                href={`/company/${review.companyId}/reviews/${review.id}`}
                className="block rounded-2xl border border-[#E5E7DB]/60 bg-[#F9FAF7] p-4 transition hover:border-[#19C37D]/50 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-[#111827]">{review.companyName}</p>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-[#6B7280]">
                    <Star className="size-3.5 fill-[#19C37D] text-[#19C37D]" />
                    {review.score} 分 · {review.relation}
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#374151]">{review.shortComment}</p>
                <p className="mt-2 text-xs text-[#9CA3AF]">
                  有用 {review.helpful} · 追问 {review.commentCount} · {new Date(review.createdAt).toLocaleDateString("zh-CN")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </SolidCard>

      {/* My favorites */}
      <SolidCard variant="default" className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111827]">我的收藏</h2>
          <span className="text-xs text-[#6B7280]" data-testid="me-favorites-count">
            共 {favoriteSet.size} 家公司
          </span>
        </div>
        {myFavoriteList.length === 0 && hydrated ? (
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
            {myFavoriteList.map((fav) => {
              const company = companies.find((c) => c.id === fav.companyId)
              return (
                <Link
                  key={fav.companyId}
                  href={`/company/${fav.companyId}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[#E5E7DB]/60 bg-[#F9FAF7] p-4 transition hover:border-[#19C37D]/50 hover:bg-white"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#111827]">{fav.companyName}</p>
                    <p className="mt-1 text-xs text-[#6B7280]">
                      {company ? `${company.industry} · ${company.city}` : "已收藏公司"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-[#19C37D]">
                    <Bookmark className="size-4 fill-current" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </SolidCard>

      {/* Badges with progress */}
      <SolidCard variant="default" className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111827]">司南徽章</h2>
          <span className="text-xs text-[#6B7280]" data-testid="me-badges-progress">
            {badgeCatalog.filter((b) => b.unlocked).length} / {badgeCatalog.length} 已解锁
          </span>
        </div>
        <div className="grid gap-2" data-testid="me-badges-list">
          {badgeCatalog.map((badge) => {
            const progress = badge.progress ?? badge.target ?? 0
            const target = badge.target ?? 0
            const ratio = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : badge.unlocked ? 100 : 0
            return (
              <div
                key={badge.id}
                className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${
                  badge.unlocked ? "bg-[#DFF8EC]" : "bg-[#F9FAF7] border border-[#E5E7DB]/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-9 items-center justify-center rounded-xl ${
                      badge.unlocked ? "bg-[#19C37D] text-white" : "bg-[#E5E7DB] text-[#6B7280]"
                    }`}
                  >
                    {badge.unlocked ? <Award className="size-4" /> : <Lock className="size-4" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${badge.unlocked ? "text-[#07563A]" : "text-[#111827]"}`}>
                      {badge.name}
                    </p>
                    <p className="text-xs text-[#6B7280]">{badge.description}</p>
                  </div>
                </div>
                {!badge.unlocked && target > 0 ? (
                  <div className="min-w-[120px] text-right">
                    <p className="text-xs text-[#6B7280]">
                      {progress} / {target}
                    </p>
                    <Progress value={ratio} className="mt-1 h-1.5" />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E5E7DB]/40 pt-4">
          {currentUser.badges.map((badge) => (
            <Badge
              key={badge}
              variant="secondary"
              className="rounded-full border-[#E5E7DB]/60 bg-[#F1F5EF] px-3 py-1.5 text-xs font-medium text-[#374151]"
            >
              {badge}
            </Badge>
          ))}
        </div>
      </SolidCard>
    </section>
  )
}

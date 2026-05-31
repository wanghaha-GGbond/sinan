"use client"

import Link from "next/link"
import { Award, Flame, Navigation, LogIn, ChevronRight } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { currentUser, dailyTasks } from "@/lib/mock-data"

export default function MePage() {
  const { user, loading } = useAuth()

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
            匿名保护，不向公司开放身份
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
              className={`flex items-center justify-between rounded-2xl p-4 transition ${
                task.completed
                  ? "bg-[#DFF8EC]"
                  : "bg-[#F9FAF7] border border-[#E5E7DB]/60"
              }`}
            >
              <div>
                <p className={`text-sm font-medium ${task.completed ? "text-[#07563A]" : "text-[#111827]"}`}>
                  {task.completed && "✅ "}{task.title}
                </p>
                <p className="mt-0.5 text-xs text-[#9CA3AF]">
                  奖励 +{task.rewardPoints} 方向值 · 进度 {task.progress}/{task.target}
                </p>
              </div>
              {!task.completed && (
                <SolidButton variant="secondary" size="sm">
                  去完成
                </SolidButton>
              )}
            </div>
          ))}
        </div>
      </SolidCard>

      {/* Badges */}
      <SolidCard variant="default" className="p-5">
        <h2 className="mb-4 text-base font-semibold text-[#111827]">司南徽章</h2>
        <div className="flex flex-wrap gap-2">
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

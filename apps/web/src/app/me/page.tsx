import { Award, Flame, Navigation } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { currentUser, dailyTasks } from "@/lib/mock-data"

export default function MePage() {
  const levelGap = currentUser.nextLevelPoints - currentUser.directionPoints
  const levelProgress = Math.round((currentUser.directionPoints / currentUser.nextLevelPoints) * 100)

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">我的</h1>
        <p className="mt-3 text-muted-foreground">这里展示方向值、连续点灯、今日指路任务与司南徽章。MVP 阶段均为 mock 数据。</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="solid-card border border-[#E5E7DB]/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Navigation />
              方向值
            </CardTitle>
          </CardHeader>
          <CardContent data-testid="me-direction-points" className="space-y-2">
            <p className="text-3xl font-semibold">{currentUser.directionPoints}</p>
            <p className="text-sm text-muted-foreground">距离 L4 还差 {levelGap}</p>
            <Progress value={levelProgress} />
          </CardContent>
        </Card>
        <Card className="solid-card-subtle border border-[#E5E7DB]/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame />
              连续点灯
            </CardTitle>
          </CardHeader>
          <CardContent data-testid="me-streak-days" className="space-y-2">
            <p className="text-3xl font-semibold">{currentUser.streakDays} 天</p>
            <p className="text-sm text-muted-foreground">今天再看 1 条评价即可保持点灯</p>
          </CardContent>
        </Card>
        <Card className="solid-card-subtle border border-[#E5E7DB]/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award />
              指路等级
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold">L{currentUser.trustLevel} 指路等级</p>
            <p className="text-sm text-muted-foreground">已帮助 {currentUser.helpedCount} 位后来者</p>
          </CardContent>
        </Card>
      </div>
      <Card className="solid-card-subtle border border-[#E5E7DB]/60">
        <CardHeader>
          <CardTitle>今日指路任务</CardTitle>
        </CardHeader>
        <CardContent data-testid="me-daily-tasks" className="grid gap-3">
          {dailyTasks.map((task) => (
            <div key={task.id} className="rounded-2xl bg-[#F1F5EF] p-3">
              <p className="font-medium">{task.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">奖励 +{task.rewardPoints} 方向值</p>
              <p className="mt-1 text-xs text-muted-foreground">
                进度 {task.progress}/{task.target}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="solid-card-subtle border border-[#E5E7DB]/60">
        <CardHeader>
          <CardTitle>司南徽章</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {currentUser.badges.map((badge) => (
            <Badge key={badge} variant="secondary">
              {badge}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}

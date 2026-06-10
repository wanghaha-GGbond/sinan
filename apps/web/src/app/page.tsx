import Link from "next/link"
import { ArrowRight, MessageCircleQuestion, Route } from "lucide-react"

import { MetricPill } from "@/components/ui/metric-pill"
import { ScoreChip } from "@/components/ui/score-chip"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import { recommendedCompanyItems, reviewDiscussions, userPreference } from "@/lib/mock-data"

export default function HomePage() {
  const quickPrefs = [
    userPreference.targetIndustries[0],
    userPreference.targetIndustries[1],
    userPreference.targetCities[0],
  ].filter(Boolean)
  const extraCount =
    userPreference.targetIndustries.length +
    userPreference.targetCities.length +
    userPreference.concerns.length -
    quickPrefs.length
  const publicDiscussions = reviewDiscussions.filter(
    (discussion) => discussion.status === "visible" || discussion.status === "limited_visible"
  )

  return (
    <section className="mx-auto w-full max-w-page px-4 py-4 sm:px-6" data-testid="home-recommend-feed">
      <div data-testid="home-brand-hero" className="mb-5 border-b border-border px-1 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">推荐</h2>
            <p className="text-sm text-muted-foreground">最近被关注</p>
          </div>
          <Route className="size-4 text-primary" />
        </div>
        <p className="mt-2 inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground" data-testid="home-preference-hint">
          你的方向：{quickPrefs.join(" / ")} {extraCount > 0 ? `+${extraCount}` : ""}
        </p>
      </div>

      <div className="grid gap-4">
        {recommendedCompanyItems
          .filter((item) => ["northstar-tech", "river-finance", "lighthouse-media"].includes(item.companyId))
          .filter((item, index, items) => items.findIndex((candidate) => candidate.companyId === item.companyId) === index)
          .map((item) => {
            const companyDiscussions = publicDiscussions
              .filter((discussion) => discussion.companyId === item.companyId)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            const latestDiscussion =
              companyDiscussions.find((discussion) => !discussion.tags?.includes("面试")) ??
              companyDiscussions[0]

            return (
          <SolidCard key={item.id} data-testid="recommend-company-card" variant="default" className="p-5 transition-transform hover:-translate-y-0.5">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <TagPill tone="match" className="" selected={false}>{item.recommendReason}</TagPill>
                <span className="text-xs text-muted-foreground">匹配：{item.matchedPreferences.slice(0, 2).join(" / ")}</span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-foreground">{item.companyName}</h3>
                  <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
                    <span>{item.industry}</span>
                    <span>{item.city}</span>
                    <span>{item.size}</span>
                  </p>
                </div>
                <ScoreChip score={item.directionScore} className="shrink-0" data-testid="recommend-direction-score" />
              </div>

              <p className="flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                <span>{item.reviewCount} 条评价</span>
                <span>{item.recommendationRate}% 推荐</span>
              </p>

              <div className="grid grid-cols-2 gap-2" data-testid="recommend-metrics">
                {item.highlightedMetrics.slice(0, 2).map((metric) => (
                  <MetricPill key={metric.label} label={metric.label} score={metric.score} />
                ))}
              </div>

              {item.vibeTagName ? (
                <TagPill tone="neutral" data-testid="recommend-vibe-tag">
                  公司体感：{item.vibeTagName}
                </TagPill>
              ) : null}
              {item.vibeTagSummary ? <p className="line-clamp-2 text-sm text-muted-foreground">{item.vibeTagSummary}</p> : null}

              <div className="border-y border-border py-3" data-testid="recommend-discussion-preview">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                    <MessageCircleQuestion className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">讨论区</p>
                      <span className="text-xs text-muted-foreground">{companyDiscussions.length} 条讨论</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {latestDiscussion?.maskedContent ?? latestDiscussion?.content ?? "还没有讨论，来问一个具体问题。"}
                    </p>
                    <Link
                      href={`/community?companyId=${item.companyId}`}
                      className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
                    >
                      {latestDiscussion ? "进入讨论" : "去讨论区"}
                      <ArrowRight className="ml-1 size-4" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="text-muted-foreground">
                  近 7 天新增 {item.recentReviewCount} 条
                  {typeof item.officeExperienceScore === "number" ? (
                    <span data-testid="recommend-office-experience"> · 办公 {item.officeExperienceScore.toFixed(1)}</span>
                  ) : null}
                </p>
                <SolidButton asChild variant="primary" size="sm">
                  <Link href={`/company/${item.companyId}`} className="shrink-0">
                    看这家公司
                    <ArrowRight className="size-4" />
                  </Link>
                </SolidButton>
              </div>
            </div>
          </SolidCard>
            )
          })}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">更多公司方向正在整理中。</p>
    </section>
  )
}

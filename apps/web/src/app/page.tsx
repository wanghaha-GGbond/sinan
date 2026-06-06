import Link from "next/link"
import { ArrowRight, Route } from "lucide-react"

import { MetricPill } from "@/components/ui/metric-pill"
import { ScoreChip } from "@/components/ui/score-chip"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import { recommendedCompanyItems, userPreference } from "@/lib/mock-data"

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

  return (
    <section className="mx-auto w-full max-w-[860px] px-4 py-4 sm:px-6" data-testid="home-recommend-feed">
      <div data-testid="home-brand-hero" className="mb-4 rounded-3xl bg-muted px-4 py-3 shadow-[0_5px_0_rgba(17,24,39,0.03)]">
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
        {recommendedCompanyItems.map((item) => (
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

              <div className="grid gap-2 sm:grid-cols-3" data-testid="recommend-metrics">
                {item.highlightedMetrics.slice(0, 3).map((metric) => (
                  <MetricPill key={metric.label} label={metric.label} score={metric.score} />
                ))}
              </div>

              {item.vibeTagName ? (
                <TagPill tone="neutral" data-testid="recommend-vibe-tag">
                  公司体感：{item.vibeTagName}
                </TagPill>
              ) : null}
              {item.vibeTagSummary ? <p className="text-xs text-muted-foreground">{item.vibeTagSummary}</p> : null}
              {typeof item.officeExperienceScore === "number" ? (
                <p className="text-xs text-muted-foreground" data-testid="recommend-office-experience">
                  办公体验 {item.officeExperienceScore.toFixed(1)}
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="text-muted-foreground">近 7 天新增 {item.recentReviewCount} 条评价</p>
                <SolidButton asChild variant="primary" size="sm">
                  <Link href={`/company/${item.companyId}`} className="shrink-0">
                    看这家公司
                    <ArrowRight className="size-4" />
                  </Link>
                </SolidButton>
              </div>
            </div>
          </SolidCard>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">继续下滑，看更多过来人评价。</div>
    </section>
  )
}

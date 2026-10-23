import Link from "next/link"
import { ArrowUpRight, BrainCircuit, ShieldCheck } from "lucide-react"

import type { CompanyListItem } from "@/lib/types"

export function CompanyEvidenceRail({ company }: { company: CompanyListItem }) {
  const distribution = company.scoreDistribution ?? []
  const hasSamples = (company.reviewCount ?? 0) > 0
  const hasDistribution = hasSamples && distribution.some((item) => item.count > 0)
  const maxCount = Math.max(...distribution.map((item) => item.count), 1)
  const hasRecommendation = hasSamples && typeof company.recommendationRate === "number"
    && Number.isFinite(company.recommendationRate)

  return (
    <aside className="min-w-0 self-start border-t border-border min-[1200px]:border-l min-[1200px]:border-t-0 min-[1200px]:pl-6" aria-label="公司证据摘要">
      <section className="border-b border-border py-6 min-[1200px]:pt-0">
        <h2 className="text-lg font-semibold">评分分布</h2>
        {hasDistribution ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">原始方向评分 · 满分 10 分</p>
            <div className="mt-5 grid gap-3">
              {[...distribution].reverse().map((item) => (
                <div key={item.score} className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3 text-sm text-muted-foreground">
                  <span>{item.score}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <span className="block h-full rounded-full bg-foreground" style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{item.count} 条</span>
                </div>
              ))}
            </div>
          </>
        ) : <p className="mt-3 text-sm text-muted-foreground">评分样本积累中，暂不展示分布。</p>}
      </section>

      <section className="border-b border-border py-6" data-testid="company-recommendation-panel">
        <h2 className="text-lg font-semibold">推荐信号</h2>
        {hasRecommendation ? (
          <div className="mt-3 flex items-baseline gap-3">
            <p className="text-2xl font-semibold tabular-nums">{company.recommendationRate}<span className="ml-1 text-sm font-normal text-muted-foreground">%</span></p>
            <p className="text-sm text-muted-foreground">愿意推荐给朋友</p>
          </div>
        ) : <p className="mt-3 text-sm text-muted-foreground">暂无推荐样本</p>}
        <p className="mt-2 text-sm text-muted-foreground">基于已公开的匿名评价，仅反映当前样本。</p>
      </section>

      <section className="border-b border-border py-6" data-testid="company-cbti-panel">
        <div className="flex flex-wrap items-center gap-2">
          <BrainCircuit className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-semibold">公司 MBTI（CBTI）</h2>
          {company.cbti ? <span className="inline-flex min-h-7 items-center rounded-full bg-muted px-3 text-xs font-semibold">{company.cbti.code}</span> : null}
        </div>
        <p className="mt-3 text-sm font-medium">{company.cbti?.title ?? "样本积累中"}</p>
        {company.cbti?.summary ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{company.cbti.summary}</p> : null}
        {company.cbti ? (
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            <span>节奏 · {company.cbti.axes.pace === "R" ? "快" : "稳"}</span>
            <span>管理 · {company.cbti.axes.management === "P" ? "流程" : "弹性"}</span>
            <span>成长 · {company.cbti.axes.growth === "G" ? "成长" : "稳定"}</span>
            <span>协作 · {company.cbti.axes.collaboration === "C" ? "协作" : "独立"}</span>
          </div>
        ) : null}
      </section>

      <section className="py-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />匿名评价</h2>
        <p className="mt-3 text-sm text-muted-foreground">审核通过后公开展示。</p>
        <Link href="/legal/privacy" className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-medium hover:underline">隐私政策 <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
      </section>
    </aside>
  )
}

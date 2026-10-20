import Link from "next/link"
import { BrainCircuit, Info, ShieldCheck } from "lucide-react"

import type { CompanyListItem } from "@/lib/types"

export function CompanyEvidenceRail({ company }: { company: CompanyListItem }) {
  const distribution = company.scoreDistribution?.length
    ? company.scoreDistribution
    : ["0-2", "2-4", "4-6", "6-8", "8-10"].map((score) => ({ score, count: 0 }))
  const maxCount = Math.max(...distribution.map((item) => item.count), 1)
  const starLabel = (score: string, index: number) => {
    if (/^\d$/.test(score)) return score
    return String(index + 1)
  }

  return (
    <aside className="grid content-start gap-3 lg:sticky lg:top-20" aria-label="公司证据摘要">
      <section className="web-surface web-surface-base p-5 pb-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">评分分布 <Info className="size-3.5 text-muted-foreground" aria-hidden="true" /></h2>
        </div>
        <div className="mt-5 grid gap-3">
          {[...distribution].map((item, index) => ({ ...item, index })).reverse().map((item) => (
            <div key={item.score} className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 text-xs text-muted-foreground">
              <span>{starLabel(item.score, item.index)} 星</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }} />
              </span>
              <span className="text-right tabular-nums">{Math.round((item.count / Math.max(company.reviewCount ?? maxCount, 1)) * 100)}%</span>
            </div>
          ))}
        </div>
      </section>

      <section className="web-surface web-surface-base p-3" data-testid="company-recommendation-panel">
        <p className="text-sm font-semibold text-foreground">推荐信号</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex size-16 items-center justify-center rounded-full border-[5px] border-primary/20 border-t-primary border-r-primary text-lg font-semibold text-foreground">
            {company.recommendationRate ?? 0}%
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">愿意推荐给朋友</p>
            <p className="mt-1 text-xs text-muted-foreground">基于已公开的匿名评价</p>
          </div>
        </div>
      </section>

      <section className="order-4 web-surface web-surface-base p-4" data-testid="company-cbti-panel">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">公司 MBTI（CBTI）</h2>
          </div>
          {company.cbti ? <span className="rounded-full border border-primary-surface-border bg-card px-2 py-0.5 text-xs font-semibold text-primary-deep">{company.cbti.code}</span> : null}
        </div>
        <p className="mt-3 text-base font-semibold text-primary-deep">{company.cbti?.title ?? "样本积累中"}</p>
        {company.cbti?.summary ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{company.cbti.summary}</p> : null}
        {company.cbti ? (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-primary-surface-border/70 pt-3 text-xs text-muted-foreground">
            <span>节奏 · {company.cbti.axes.pace === "R" ? "快" : "稳"}</span>
            <span>管理 · {company.cbti.axes.management === "P" ? "流程" : "弹性"}</span>
            <span>成长 · {company.cbti.axes.growth === "G" ? "成长" : "稳定"}</span>
            <span>协作 · {company.cbti.axes.collaboration === "C" ? "协作" : "独立"}</span>
          </div>
        ) : null}
      </section>

      <section className="order-3 web-surface web-surface-base p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">匿名评价</h2>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">审核通过后公开展示。</p>
        <Link href="/legal/privacy" className="mt-2 inline-flex min-h-11 items-center text-xs font-medium text-primary-deep hover:underline">隐私政策 →</Link>
      </section>
    </aside>
  )
}

import { COMPANY_SCORE_DIMENSIONS, type CompanyDimensionSummary } from "@/lib/company-score-dimensions"

export function CompanyDimensionSummaryPanel({ dimensions = [] }: { dimensions?: CompanyDimensionSummary[] }) {
  return (
    <section aria-labelledby="company-dimension-heading" className="rounded-lg border border-border bg-card p-5 sm:p-7">
      <h2 id="company-dimension-heading" className="text-xl font-semibold">多维评分</h2>
      <p className="mt-2 text-sm text-muted-foreground">来自已公开评价 · 满分 10 分</p>
      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        {COMPANY_SCORE_DIMENSIONS.map(({ key, label }) => {
          const item = dimensions.find(item => item.key === key)
          const score = item && item.count > 0 ? item.score : null
          return <div key={key} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3"><dt className="text-sm font-medium">{label}</dt><dd className="text-sm tabular-nums">{score == null ? <span className="text-muted-foreground">暂无评分</span> : <><strong>{score.toFixed(1)}</strong><span className="ml-2 text-xs text-muted-foreground">{item?.count} 份回答</span></>}</dd></div>
            <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${score == null ? 0 : score * 10}%` }} /></div>
          </div>
        })}
      </dl>
    </section>
  )
}

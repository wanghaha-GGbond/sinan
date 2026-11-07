import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { companyCards, getCompanySlug, mergeCompanyIndices, researchGeneratedAt } from "@/lib/research-report"
import { researchHeadline } from "@/lib/research-presentation"
import { getPublishedResearchSnapshot } from "@/lib/server/published-research"

export const metadata: Metadata = {
  title: "公司研究 | 在场",
  description: "公司机会、风险与工作体验，一眼看到重点。",
}

export const dynamic = "force-dynamic"

export default async function ResearchPage() {
  const published = await getPublishedResearchSnapshot()
  const indices = mergeCompanyIndices(published?.companies)
  const sorted = [...indices].sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1))
  const generatedAt = published?.generatedAt ?? researchGeneratedAt
  const cardsByName = new Map(companyCards.map(card => [card.name, card]))

  return (
    <section className="break-normal bg-muted px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-hero">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">公司研究</h1>
          <p className="mt-2 text-sm text-muted-foreground">{indices.length} 家公司 · 更新于 {generatedAt.slice(0, 10)}</p>
        </header>
        <section aria-labelledby="ranking-title">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="ranking-title" className="text-lg font-semibold">研究指数</h2>
            <span className="text-xs text-muted-foreground">满分 100</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {sorted.map((company, position) => (
              <Link key={company.name} href={`/research/${getCompanySlug(company.name)}`}
                className="group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border p-5 last:border-0 hover:bg-muted-hover focus-visible:outline-2 focus-visible:outline-ring sm:grid-cols-[2rem_minmax(0,1fr)_auto]">
                <span className="hidden font-mono text-sm text-muted-foreground sm:block">{String(position + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <h3 className="font-semibold group-hover:text-primary-deep">{company.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{company.city} · {company.industry}</p>
                  <p className="mt-3 break-words text-sm leading-6 text-foreground/85">{researchHeadline(cardsByName.get(company.name))}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <strong className="font-mono text-lg sm:text-xl">{company.overallScore ?? <span className="text-xs font-normal text-muted-foreground">暂无指数</span>}</strong>
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </section>
        <p className="mt-4 text-xs text-muted-foreground">研究指数与用户评分独立，结论不代表具体岗位。</p>
        <details className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
          <summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">关于研究指数</summary>
          <p className="pb-3 leading-6">指数综合职业机会、成长、工作体验、薪酬透明度与稳定性。数据不足的项目不显示分数；每份研究底部可查看依据。</p>
        </details>
      </div>
    </section>
  )
}

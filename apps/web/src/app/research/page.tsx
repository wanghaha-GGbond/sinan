import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import {
  companyCards,
  componentLabels,
  getCompanySlug,
  mergeCompanyIndices,
  researchGeneratedAt,
  researchSummary,
} from "@/lib/research-report"
import { getPublishedResearchSnapshot } from "@/lib/server/published-research"

export const metadata: Metadata = {
  title: "公司研究 | 在场",
  description: "在场头部互联网与金融公司研究：职业机会、成长动能、工作体验与证据边界。",
}

export const dynamic = "force-dynamic"

export default async function ResearchPage() {
  const published = await getPublishedResearchSnapshot()
  const indices = mergeCompanyIndices(published?.companies)
  const sorted = [...indices].sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1))
  const generatedAt = published?.generatedAt ?? researchGeneratedAt

  return (
    <div className="pb-16">
      <header className="border-b bg-[radial-gradient(circle_at_top_left,var(--primary-tint),transparent_48%)]">
        <div className="mx-auto w-full max-w-hero px-4 py-8 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">公司研究</h1>
          <p className="mt-3 text-sm text-muted-foreground">{indices.length} 家公司 · 更新于 {generatedAt}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-hero space-y-12 px-4 py-10 sm:px-6">
        <section aria-labelledby="ranking-title">
          <h2 id="ranking-title" className="mb-5 text-xl font-semibold">研究指数</h2>

          <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            {sorted.map((company, position) => (
              <Link
                key={company.name}
                href={`/research/${getCompanySlug(company.name)}`}
                className="group grid gap-4 border-b p-5 transition last:border-b-0 hover:bg-primary-tint sm:grid-cols-[2rem_1.1fr_1.4fr_7rem] sm:items-center"
              >
                <span className="font-mono text-sm font-bold text-muted-foreground">{String(position + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-bold group-hover:text-primary-deep">{company.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{company.city} · {company.industry}</p>
                </div>
                <div className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${company.overallScore ?? 0}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">可信度 {company.confidence}%</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:gap-3">
                  <strong className="shrink-0 whitespace-nowrap font-mono text-xl">{company.overallScore ?? "待补证据"}</strong>
                  <ArrowRight className="size-4 shrink-0 transition group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <details className="rounded-2xl border bg-card px-5 py-4">
          <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-primary">数据来源与评分说明</summary>
          <div className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
            <p>基于 {researchSummary.observations} 条公开记录，其中 {researchSummary.usableObservations} 条可用、{researchSummary.externalEvidence} 条来自外部证据。</p>
            <p>分数按证据可信度向 50 分校正，不代表每个部门、城市或岗位的实际体验。</p>
            <p>搜索摘要仅作线索，未经核实的信息不作为确定结论。</p>
          </div>
        </details>

        <section aria-labelledby="cards-title">
          <h2 id="cards-title" className="mb-5 text-2xl font-bold">研报</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companyCards.map((card) => {
              const index = indices.find((item) => item.name === card.name)!
              return (
                <Link key={card.name} href={`/research/${getCompanySlug(card.name)}`} className="group rounded-3xl border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary-surface-border hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="text-xl font-bold">{card.name}</h3><p className="mt-1 text-xs text-muted-foreground">{card.city} · {card.industry}</p></div>
                    <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-sm font-bold">{index.overallScore ?? "待补证据"}</span>
                  </div>
                  <div className="mt-5 grid grid-cols-5 gap-1" aria-label="五项研究指数">
                    {Object.entries(index.components).map(([key, value]) => (
                      <div key={key} title={`${componentLabels[key]} ${value.score}`} className="text-center">
                        <div className="mx-auto flex h-14 w-2 items-end overflow-hidden rounded-full bg-muted"><span className="w-full rounded-full bg-primary" style={{ height: `${value.score}%` }} /></div>
                        <span className="mt-1 block truncate text-[10px] text-muted-foreground">{componentLabels[key]?.slice(0, 2)}</span>
                      </div>
                    ))}
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary-deep">阅读研报 <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
                </Link>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

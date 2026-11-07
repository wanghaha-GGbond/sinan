import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowUpRight } from "lucide-react"

import { companyIndices, componentLabels, funIndexLabels, getCompanySlug, getResearchCompany, type ScoreDetail } from "@/lib/research-report"
import { researchDisplayScore, researchHeadline, researchSignals } from "@/lib/research-presentation"
import { getPublishedResearchCompany } from "@/lib/server/published-research"

export const dynamic = "force-dynamic"

export function generateStaticParams() {
  return companyIndices.map(company => ({ slug: getCompanySlug(company.name) }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const result = getResearchCompany(slug)
  return result ? { title: `${result.card.name}研究报告 | 在场`, description: researchHeadline(result.card) } : {}
}

export default async function CompanyResearchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = getResearchCompany(slug)
  if (!result) notFound()
  const { card } = result
  const index = (await getPublishedResearchCompany(card.name)) ?? result.index
  const opportunities = researchSignals(card.opportunityDetails)
  const risks = researchSignals(card.riskDetails)
  const scoreEntries = [
    ...Object.entries(index.components).map(([key, detail]) => ({ label: componentLabels[key] ?? key, detail })),
    ...Object.entries(index.funIndices).map(([key, detail]) => ({ label: funIndexLabels[key] ?? key, detail })),
  ]

  return (
    <section className="break-normal bg-muted px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <Link href="/research" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />公司研究</Link>
        <header className="mt-3 rounded-xl border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{card.city} · {card.industry}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{card.name}研究报告</h1>
            </div>
            <div className="shrink-0 rounded-lg bg-primary-tint px-4 py-3 text-primary-deep">
              <span className="text-xs">研究指数</span>
              <p className="mt-1"><strong className="font-mono text-3xl">{index.overallScore ?? <span className="text-sm">暂无指数</span>}</strong>{index.overallScore !== null && <span className="ml-1 text-xs">/ 100</span>}</p>
            </div>
          </div>
          {card.departments.length > 0 && <div className="mt-5 flex flex-wrap gap-2" aria-label="关注方向">{card.departments.map(item => <span key={item} className="rounded-md bg-muted px-2.5 py-1.5 text-xs">{item}</span>)}</div>}
          <p className="mt-5 text-xs text-muted-foreground">截至 {(index.dataAsOf ?? card.generatedAt).slice(0, 10)} · 公司整体判断，不代表具体岗位。</p>
        </header>

        <div className="mt-7 space-y-8" data-testid="research-results">
          <Section title="机会与风险">
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-xl border border-primary-surface-border bg-primary-tint p-5">
                <h3 className="font-semibold text-primary-deep">机会方向</h3>
                {opportunities.length ? <ul className="mt-3 space-y-3">{opportunities.map(item => <li key={item.signal} className="break-words text-sm leading-6">{item.signal}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">暂无可用机会结论</p>}
              </article>
              <article className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold">关注风险</h3>
                {risks.length ? <ul className="mt-3 space-y-3">{risks.map(item => <li key={item.signal} className="break-words text-sm leading-6">{item.signal}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">风险信息不足，尚不能判断。</p>}
              </article>
            </div>
          </Section>

          <Section title="研究指数">
            {Object.keys(index.components).length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(index.components).map(([key, detail]) => <ScoreCard key={key} label={componentLabels[key] ?? key} detail={detail} />)}</div> : <p className="text-sm text-muted-foreground">暂无指数明细</p>}
          </Section>

          <Section title="工作体验">
            <div className="space-y-5 rounded-xl border border-border bg-card p-5">
              {Object.keys(index.funIndices).length === 0 && <p className="text-sm text-muted-foreground">暂无体验数据</p>}
              {[false, true].map(risk => {
                const entries = Object.entries(index.funIndices).filter(([key]) => (key === "overtime" || key === "layoffAnxiety") === risk)
                return entries.length > 0 && <div key={String(risk)}>
                  <p className="mb-3 text-xs text-muted-foreground">{risk ? "风险项 · 越低越好" : "体验项 · 越高越好"}</p>
                  <div className="space-y-4">{entries.map(([key, detail]) => {
                    const score = researchDisplayScore(detail)
                    return <div key={key} className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)_4rem] items-center gap-3">
                      <span className="text-sm">{funIndexLabels[key] ?? key}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${risk ? "bg-risk" : "bg-primary"}`} style={{ width: `${score ?? 0}%` }} /></div>
                      <span className="text-right text-sm tabular-nums">{score ?? <span className="text-xs text-muted-foreground">暂无数据</span>}</span>
                    </div>
                  })}</div>
                </div>
              })}
            </div>
          </Section>
        </div>

        <details className="mt-8 border-t border-border pt-4 text-sm text-muted-foreground" data-testid="research-notes">
          <summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">关于本研究</summary>
          <div className="space-y-6 pb-5 pt-3">
            <p className="leading-6">指数满分 100，与用户评分独立；按数据可信度向 50 分校正。缺少数据不等于中等体验，没有风险结论也不等于没有风险。</p>
            <div className="overflow-x-auto"><table className="w-full min-w-80 text-left text-xs"><caption className="mb-3 text-left font-medium">指标依据</caption><thead><tr className="border-b border-border"><th scope="col" className="py-2">指标</th><th scope="col">可信度</th><th scope="col">记录数</th></tr></thead><tbody>{scoreEntries.map(({ label, detail }) => <tr key={label} className="border-b border-border"><th scope="row" className="py-2 font-normal">{label}</th><td>{detail.confidence}%</td><td>{detail.evidenceCount}</td></tr>)}</tbody></table></div>
            <ul className="space-y-2 text-xs leading-6">{Array.from(new Set(scoreEntries.flatMap(({ detail }) => detail.limitations))).map(text => <li key={text}>{text}</li>)}</ul>
            <section aria-label="研究依据"><h2 className="font-medium text-foreground">研究依据</h2><ul className="mt-3 space-y-5">{[...opportunities, ...risks].map(item => <li key={item.signal}><p className="font-medium">{item.signal}</p><p className="mt-1 break-words text-xs leading-6">{item.basis}</p>{/^https?:\/\//.test(item.sourceUrl) && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs text-primary-deep underline">查看原文<ArrowUpRight className="size-3.5" aria-hidden="true" /></a>}</li>)}</ul></section>
          </div>
        </details>
      </div>
    </section>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}</section>
}

function ScoreCard({ label, detail }: { label: string; detail: ScoreDetail }) {
  const score = researchDisplayScore(detail)
  return <article className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-medium">{label}</h3><strong className="text-lg tabular-nums">{score ?? <span className="text-xs font-normal text-muted-foreground">暂无数据</span>}</strong></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${score ?? 0}%` }} /></div></article>
}

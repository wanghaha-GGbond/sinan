import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BarChart3, BookOpen, Database, ShieldCheck } from "lucide-react"

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
  title: "公司研究 | 司南",
  description: "司南头部互联网与金融公司研究：职业机会、成长动能、工作体验与证据边界。",
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
        <div className="mx-auto grid w-full max-w-hero gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.35fr_.65fr] md:py-18">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-surface-border bg-primary-tint px-3 py-1 text-xs font-bold text-primary-deep">
              <BookOpen className="size-3.5" /> 司南研究 · {generatedAt}
            </p>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
              入职之前，先看懂<br /><span className="text-primary-deep">公司真正的方向。</span>
            </h1>
            <p className="mt-5 max-w-prose-sm text-base leading-relaxed text-muted-foreground sm:text-lg">
              覆盖头部互联网与金融公司，用公开招聘、官方材料和社媒观察，拆解机会、成长、体验、薪酬透明与稳定性。每一个分数都同时展示证据可信度。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            <Metric value={researchSummary.companies} label="研究公司" />
            <Metric value={researchSummary.observations} label="公开观察" />
            <Metric value={researchSummary.usableObservations} label="可用观察" />
            <Metric value={researchSummary.externalEvidence} label="外部证据" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-hero space-y-12 px-4 py-10 sm:px-6">
        <section aria-labelledby="ranking-title">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-deep">Research index</p>
              <h2 id="ranking-title" className="mt-1 text-2xl font-bold">公司研究总览</h2>
            </div>
            <p className="text-xs text-muted-foreground">总分已按证据可信度向中性值 50 收缩</p>
          </div>

          <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            {sorted.map((company, position) => (
              <Link
                key={company.name}
                href={`/research/${getCompanySlug(company.name)}`}
                className="group grid gap-4 border-b p-5 transition last:border-b-0 hover:bg-primary-tint sm:grid-cols-[2rem_1.1fr_1.4fr_5rem] sm:items-center"
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
                  <p className="text-xs text-muted-foreground">{company.funTag} · 可信度 {company.confidence}%</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:gap-3">
                  <strong className="font-mono text-xl">{company.overallScore ?? "待补证据"}</strong>
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Note icon={BarChart3} title="指数不是排名结论">分数用于定位值得追问的方向，不代表所有部门、城市和岗位的实际体验。</Note>
          <Note icon={Database} title="证据可回溯">当前底稿包含 {researchSummary.observations} 条 observation，并用官方与外部材料校准。</Note>
          <Note icon={ShieldCheck} title="谨慎发布">搜索摘要只作线索；未经详情页或独立来源验证的说法不会写成确定事实。</Note>
        </section>

        <section aria-labelledby="cards-title">
          <h2 id="cards-title" className="mb-5 text-2xl font-bold">逐家公司看</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companyCards.map((card) => {
              const index = indices.find((item) => item.name === card.name)!
              return (
                <Link key={card.name} href={`/research/${getCompanySlug(card.name)}`} className="group rounded-3xl border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary-surface-border hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="text-xl font-bold">{card.name}</h3><p className="mt-1 text-xs text-muted-foreground">{card.city} · {card.industry}</p></div>
                    <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-sm font-bold">{index.overallScore ?? "待补证据"}</span>
                  </div>
                  <p className="mt-5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{card.oneLine}</p>
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

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="rounded-2xl border bg-card/80 p-4 backdrop-blur"><strong className="block font-mono text-2xl">{value}</strong><span className="text-xs text-muted-foreground">{label}</span></div>
}

function Note({ icon: Icon, title, children }: { icon: typeof BarChart3; title: string; children: React.ReactNode }) {
  return <article className="rounded-2xl border bg-card p-5"><Icon className="size-5 text-primary-deep" /><h3 className="mt-3 font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p></article>
}

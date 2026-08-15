import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, CircleAlert, MapPin, ShieldCheck } from "lucide-react"

import {
  companyIndices,
  componentLabels,
  funIndexLabels,
  getCompanySlug,
  getResearchCompany,
  type ScoreDetail,
} from "@/lib/research-report"
import { getPublishedResearchCompany } from "@/lib/server/published-research"

export const dynamic = "force-dynamic"

export function generateStaticParams() {
  return companyIndices.map((company) => ({ slug: getCompanySlug(company.name) }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const result = getResearchCompany(slug)
  return result ? { title: `${result.card.name}研究报告 | 司南`, description: result.card.oneLine } : {}
}

export default async function CompanyResearchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = getResearchCompany(slug)
  if (!result) notFound()
  const { card } = result
  const index = (await getPublishedResearchCompany(card.name)) ?? result.index

  return (
    <div className="pb-16">
      <header className="border-b bg-card">
        <div className="mx-auto w-full max-w-hero px-4 py-8 sm:px-6 sm:py-12">
          <Link href="/research" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> 返回研究总览</Link>
          <div className="mt-8 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{card.city}</span><span>·</span><span>{card.industry}</span><span className="rounded-full bg-muted px-2.5 py-1">{card.recommendationTier}</span></div>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">{card.name}<span className="text-primary-deep">研究报告</span></h1>
              <p className="mt-4 max-w-prose-sm text-base leading-relaxed text-muted-foreground">{card.oneLine}</p>
            </div>
            <div className="flex items-end gap-3 rounded-3xl bg-foreground p-5 text-white">
              <div><span className="text-xs text-white/60">司南总指数</span><strong className="block font-mono text-4xl">{index.overallScore ?? "待补证据"}</strong></div>
              <span className="pb-1 text-xs text-white/60">/ 100<br />可信度 {index.confidence}%</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-hero gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_19rem]">
        <div className="space-y-10">
          <Section title="五维研究指数" eyebrow="Core indices">
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(index.components).map(([key, detail]) => <ScoreCard key={key} label={componentLabels[key]} detail={detail} />)}
            </div>
          </Section>

          <Section title="机会与风险判断" eyebrow="Analyst view">
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-3xl border border-primary-surface-border bg-primary-tint p-6">
                <BriefcaseBusiness className="size-5 text-primary-deep" /><h3 className="mt-3 font-bold">值得关注的机会</h3>
                {card.opportunityDetails.length ? card.opportunityDetails.map((item) => <EvidenceItem key={item.signal} item={item} />) : <EmptyText>当前缺少可用机会判断。</EmptyText>}
              </article>
              <article className="rounded-3xl border bg-card p-6">
                <CircleAlert className="size-5 text-risk" /><h3 className="mt-3 font-bold">需要核实的风险</h3>
                {card.riskDetails.length ? card.riskDetails.map((item) => <EvidenceItem key={item.signal} item={item} />) : <EmptyText>暂无足够证据支持确定性风险结论，面试时仍应按部门核实。</EmptyText>}
              </article>
            </div>
          </Section>

          <Section title="职场体感指数" eyebrow="Workplace signals">
            <p className="-mt-2 mb-4 text-sm text-muted-foreground">“加班浓度”和“裁员恐慌”越高风险越高，其余项目越高体验越好。</p>
            <div className="space-y-3 rounded-3xl border bg-card p-5">
              {Object.entries(index.funIndices).map(([key, detail]) => (
                <div key={key} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3">
                  <span className="text-sm font-semibold">{funIndexLabels[key]}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${key === "overtime" || key === "layoffAnxiety" ? "bg-risk" : "bg-primary"}`} style={{ width: `${detail.score}%` }} /></div>
                  <span className="text-right font-mono text-sm font-bold">{detail.score}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="平台证据覆盖" eyebrow="Evidence map">
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(card.platformSummary).map(([key, platform]) => (
                <article key={key} className="rounded-2xl border bg-card p-5">
                  <div className="flex items-center justify-between"><h3 className="font-bold">{platform.label}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${platform.evidenceUsable ? "bg-primary-tint text-primary-deep" : "bg-muted text-muted-foreground"}`}>{platform.evidenceUsable ? "可用" : "待补采"}</span></div>
                  <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-muted-foreground">{platform.excerpt || "暂无可读正文"}</p>
                </article>
              ))}
            </div>
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl border bg-card p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">重点方向</p><div className="mt-3 flex flex-wrap gap-2">{card.departments.map((item) => <span key={item} className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">{item}</span>)}</div></div>
          <div className="rounded-3xl border bg-card p-5"><ShieldCheck className="size-5 text-primary-deep" /><h2 className="mt-3 font-bold">候选人建议</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.candidateAdvice}</p></div>
          <div className="rounded-3xl border border-risk-border bg-risk-surface p-5"><h2 className="font-bold text-risk-foreground">阅读边界</h2><p className="mt-2 text-xs leading-relaxed text-risk-foreground">公司级公开信号不能代表每个园区、部门或员工。薪资、加班、晋升和裁员相关数字必须回到岗位、职级、城市和年份复核。</p></div>
        </aside>
      </main>
    </div>
  )
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return <section><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-deep">{eyebrow}</p><h2 className="mb-5 mt-1 text-2xl font-bold">{title}</h2>{children}</section>
}

function ScoreCard({ label, detail }: { label: string; detail: ScoreDetail }) {
  return <article className="rounded-2xl border bg-card p-5"><div className="flex items-center justify-between"><h3 className="font-bold">{label}</h3><strong className="font-mono text-xl">{detail.score}</strong></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${detail.score}%` }} /></div><p className="mt-3 text-xs text-muted-foreground">可信度 {detail.confidence}% · {detail.evidenceCount} 条证据</p>{detail.limitations[0] ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">限制：{detail.limitations[0]}</p> : null}</article>
}

function EvidenceItem({ item }: { item: { signal: string; basis: string; sourceUrl: string } }) {
  return <div className="mt-4"><h4 className="text-sm font-bold">{item.signal}</h4><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.basis}</p>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary-deep">查看来源 <ArrowUpRight className="size-3.5" /></a> : null}</div>
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{children}</p>
}

import Link from "next/link"
import { ArrowRight, ReceiptText, Search } from "lucide-react"

import { ScoreChip } from "@/components/ui/score-chip"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import { getSalaryInsights } from "@/lib/glassdoor-insights"
import { companies } from "@/lib/mock-data"

export default function SalariesPage() {
  const insights = getSalaryInsights(companies)

  return (
    <section className="mx-auto flex w-full max-w-[960px] flex-col gap-5 px-4 py-6 sm:px-6">
      <SolidCard variant="emerald" className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#07563A]">
              <ReceiptText className="size-3.5" />
              薪资透明
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#111827]">按岗位看匿名薪资与兑现信号</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
              从现有评价里提取薪资区间、奖金兑现、调薪透明度和岗位样本，作为入职前的谈薪参考。
            </p>
          </div>
          <SolidButton asChild variant="dark">
            <Link href="/submit/review">贡献薪资样本</Link>
          </SolidButton>
        </div>
      </SolidCard>

      <div className="flex flex-wrap gap-2">
        {["高兑现", "工程岗", "产品运营", "面试前谈薪", "奖金/调薪"].map((tag) => (
          <TagPill key={tag} tone="neutral">
            {tag}
          </TagPill>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((item) => (
          <SolidCard key={`${item.companyId}-${item.role}`} variant="subtle" className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#111827]">{item.role}</p>
                <p className="mt-1 text-sm text-[#6B7280]">{item.companyName}</p>
              </div>
              <ScoreChip score={item.payScore} label="兑现分" compact />
            </div>
            <div className="mt-4 rounded-[24px] bg-[#F1F5EF] p-4">
              <p className="text-xs text-[#6B7280]">匿名薪资区间</p>
              <p className="mt-1 text-2xl font-semibold text-[#111827]">{item.range}</p>
              <p className="mt-1 text-sm text-[#6B7280]">中位参考：{item.medianLabel} · {item.sampleCount} 个样本</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#6B7280]">{item.signal}</p>
            <div className="mt-4 flex items-center justify-between">
              <SolidButton asChild variant="ghost" size="sm">
                <Link href="/search">
                  <Search className="size-4" />
                  换家公司
                </Link>
              </SolidButton>
              <SolidButton asChild variant="primary" size="sm">
                <Link href={`/company/${item.companyId}`}>
                  公司页
                  <ArrowRight className="size-4" />
                </Link>
              </SolidButton>
            </div>
          </SolidCard>
        ))}
      </div>
    </section>
  )
}

import Link from "next/link"
import { ArrowRight, Coffee, Gift, MonitorSmartphone, TrainFront } from "lucide-react"

import { ScoreChip } from "@/components/ui/score-chip"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import { getBenefitInsights } from "@/lib/glassdoor-insights"
import { companies } from "@/lib/mock-data"

export default function BenefitsPage() {
  const insights = getBenefitInsights(companies)

  return (
    <section className="mx-auto flex w-full max-w-[960px] flex-col gap-5 px-4 py-6 sm:px-6">
      <SolidCard variant="emerald" className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#07563A]">
              <Gift className="size-3.5" />
              福利与办公体验
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#111827]">把福利从口号拆成真实体验</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
              聚合办公环境、通勤、食堂、下午茶、工位和设备等匿名样本，保留司南的“公司体感”表达。
            </p>
          </div>
          <SolidButton asChild variant="dark">
            <Link href="/submit/review">补充办公体验</Link>
          </SolidButton>
        </div>
      </SolidCard>

      <div className="grid gap-4">
        {insights.map((item) => (
          <SolidCard key={item.companyId} variant="subtle" className="p-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#111827]">{item.companyName}</h2>
                  {item.tags.map((tag) => (
                    <TagPill key={tag} tone="neutral">
                      {tag}
                    </TagPill>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-6 text-[#6B7280]">{item.signal}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-[22px] bg-[#F1F5EF] p-3">
                    <TrainFront className="size-4 text-[#19C37D]" />
                    <p className="mt-2 text-xs text-[#6B7280]">通勤</p>
                    <p className="font-semibold text-[#111827]">{item.commuteScore.toFixed(1)}</p>
                  </div>
                  <div className="rounded-[22px] bg-[#F1F5EF] p-3">
                    <Coffee className="size-4 text-[#19C37D]" />
                    <p className="mt-2 text-xs text-[#6B7280]">食堂</p>
                    <p className="font-semibold text-[#111827]">{item.canteenScore.toFixed(1)}</p>
                  </div>
                  <div className="rounded-[22px] bg-[#F1F5EF] p-3">
                    <MonitorSmartphone className="size-4 text-[#19C37D]" />
                    <p className="mt-2 text-xs text-[#6B7280]">综合办公</p>
                    <p className="font-semibold text-[#111827]">{item.officeScore.toFixed(1)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 lg:justify-end">
                <ScoreChip score={item.officeScore} label="体验分" compact />
                <SolidButton asChild variant="primary" size="sm">
                  <Link href={`/company/${item.companyId}`}>
                    公司页
                    <ArrowRight className="size-4" />
                  </Link>
                </SolidButton>
              </div>
            </div>
          </SolidCard>
        ))}
      </div>
    </section>
  )
}

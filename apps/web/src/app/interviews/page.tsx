import Link from "next/link"
import { ArrowRight, MessageSquareText } from "lucide-react"

import { ScoreChip } from "@/components/ui/score-chip"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import { getInterviewInsights } from "@/lib/glassdoor-insights"
import { companies } from "@/lib/mock-data"

export default function InterviewsPage() {
  const insights = getInterviewInsights(companies)

  return (
    <section className="mx-auto flex w-full max-w-[960px] flex-col gap-5 px-4 py-6 sm:px-6">
      <SolidCard variant="elevated" className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#DFF8EC] px-3 py-1 text-xs font-semibold text-[#07563A]">
              <MessageSquareText className="size-3.5" />
              面试情报
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#111827]">提前知道流程、轮次和真实体验</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
              聚合面试者和过来人的匿名样本，帮助你确认轮次、等待时间、题目相关性和团队沟通方式。
            </p>
          </div>
          <SolidButton asChild variant="primary">
            <Link href="/submit/review">写面试体验</Link>
          </SolidButton>
        </div>
      </SolidCard>

      <div className="grid gap-4">
        {insights.map((item) => (
          <SolidCard key={item.companyId} variant="subtle" className="p-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#111827]">{item.companyName}</h2>
                  <TagPill tone="neutral">{item.role}</TagPill>
                  <TagPill tone="match">{item.rounds}</TagPill>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#6B7280]">{item.signal}</p>
                <p className="mt-2 text-xs text-[#6B7280]">{item.sampleCount} 条匿名面试/流程信号</p>
              </div>
              <div className="flex items-center gap-3 md:justify-end">
                <ScoreChip score={item.experienceScore} label="体验分" compact />
                <SolidButton asChild variant="primary" size="sm">
                  <Link href={`/company/${item.companyId}`}>
                    看公司
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

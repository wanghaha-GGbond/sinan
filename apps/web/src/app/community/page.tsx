import Link from "next/link"
import { ArrowRight, MessageCircleQuestion, UsersRound } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import { getCommunityInsights } from "@/lib/glassdoor-insights"
import { companies, reviewDiscussions } from "@/lib/mock-data"

export default function CommunityPage() {
  const discussions = getCommunityInsights(companies, reviewDiscussions)

  return (
    <section className="mx-auto flex w-full max-w-[960px] flex-col gap-5 px-4 py-6 sm:px-6">
      <SolidCard variant="elevated" className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#DFF8EC] px-3 py-1 text-xs font-semibold text-[#07563A]">
              <UsersRound className="size-3.5" />
              社区问答
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#111827]">把评价后面的追问也看见</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
              Glassdoor 式社区能力映射到司南：围绕一条评价继续追问、补充、打码展示，并保留匿名身份保护。
            </p>
          </div>
          <SolidButton asChild variant="primary">
            <Link href="/submit/review">发起新评价</Link>
          </SolidButton>
        </div>
      </SolidCard>

      <div className="grid gap-4 md:grid-cols-2">
        {discussions.map((item) => (
          <SolidCard key={item.discussionId} variant="subtle" className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{item.companyName}</p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  {item.type === "question" ? "追问" : "补充"} · {item.authorLabel}
                </p>
              </div>
              <div className="rounded-full bg-[#F1F5EF] px-3 py-1 text-xs font-semibold text-[#07563A]">
                有用 {item.usefulCount}
              </div>
            </div>
            <div className="mt-4 rounded-[24px] bg-white p-4 text-sm leading-6 text-[#374151]">
              <MessageCircleQuestion className="mb-2 size-4 text-[#19C37D]" />
              {item.content}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.tags.slice(0, 3).map((tag) => (
                <TagPill key={tag} tone={tag.includes("面试") || tag.includes("薪资") ? "match" : "neutral"}>
                  #{tag}
                </TagPill>
              ))}
            </div>
            <div className="mt-4">
              <SolidButton asChild variant="primary" size="sm">
                <Link href={`/company/${item.companyId}`}>
                  看公司讨论
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

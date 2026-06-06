import Link from "next/link"
import { BriefcaseBusiness, Gift, MessageSquareText, ReceiptText, Sparkles, UsersRound } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import { getCompanySnapshot } from "@/lib/glassdoor-insights"
import type { Company } from "@/lib/types"

export function CompanyIntelligencePanel({ company }: { company: Company }) {
  const snapshot = getCompanySnapshot(company)

  const cards = [
    {
      label: "薪资",
      icon: ReceiptText,
      value: snapshot.salaryMedian,
      detail: `${snapshot.salarySamples} 个匿名样本 · 兑现分 ${snapshot.payScore.toFixed(1)}`,
      href: "/salaries",
    },
    {
      label: "面试",
      icon: MessageSquareText,
      value: snapshot.interviewScore.toFixed(1),
      detail: `${snapshot.interviewCount} 条流程/体验信号`,
      href: "/interviews",
    },
    {
      label: "机会",
      icon: BriefcaseBusiness,
      value: `${snapshot.openRoles.length} 类岗位`,
      detail: snapshot.topRole,
      href: "/jobs",
    },
    {
      label: "福利",
      icon: Gift,
      value: (company.scoreOfficeExperience ?? company.directionScore).toFixed(1),
      detail: "办公、通勤、食堂和设备体验",
      href: "/benefits",
    },
    {
      label: "社区",
      icon: UsersRound,
      value: `${snapshot.communityCount}`,
      detail: "追问、补充和过来人讨论",
      href: "/community",
    },
  ]

  return (
    <SolidCard variant="elevated" className="mb-4 p-5" data-testid="company-intelligence-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            <Sparkles className="size-3.5" />
            职场情报概览
          </div>
          <h2 className="mt-3 text-xl font-semibold text-foreground">像看公司说明书一样看清这家公司</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            保留司南的方向分与匿名保护，同时把薪资、面试、机会和风险提示集中到一个可决策面板。
          </p>
        </div>
        <SolidButton asChild variant="primary" size="sm">
          <Link href="/submit/review">补充情报</Link>
        </SolidButton>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-[24px] border border-border/70 bg-[#F8FAF4] p-4 transition hover:-translate-y-0.5 hover:bg-white"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <card.icon className="size-4 text-primary" />
              {card.label}
            </div>
            <p className="mt-3 text-2xl font-semibold text-foreground">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {snapshot.openRoles.map((role) => (
          <TagPill key={role} tone="neutral">
            {role}
          </TagPill>
        ))}
        {company.riskTags.slice(0, 2).map((tag) => (
          <TagPill key={tag} tone="risk">
            #{tag}
          </TagPill>
        ))}
      </div>
    </SolidCard>
  )
}

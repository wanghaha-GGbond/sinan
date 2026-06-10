import Link from "next/link"
import { BadgeCheck, BriefcaseBusiness, Gift, ReceiptText, Sparkles, UsersRound } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
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
      detail: `${snapshot.salarySamples} 个匿名样本 ｜ 兑现分 ${snapshot.payScore.toFixed(1)}`,
      href: "/salaries",
    },
    {
      label: "认证",
      icon: BadgeCheck,
      value: company.claimedStatus === "claimed" ? "已认证" : "未认证",
      detail: company.claimedStatus === "claimed" ? "企业主体与负责人已核验" : "可申请维护官方资料",
      href: `/company-verification?companyId=${encodeURIComponent(company.id)}&companyName=${encodeURIComponent(company.name)}`,
    },
    {
      label: "机会",
      icon: BriefcaseBusiness,
      value: snapshot.openRoles.length > 0 ? `${snapshot.openRoles.length} 类岗位` : "暂无岗位数据",
      detail: snapshot.openRoles.length > 0 ? snapshot.topRole : "等待更多岗位样本",
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
      value: snapshot.communityCount > 0 ? `${snapshot.communityCount}` : "暂无讨论",
      detail: snapshot.communityCount > 0 ? "追问、补充和过来人讨论" : "成为第一个发起讨论的人",
      href: "/community",
    },
  ]

  return (
    <section className="mb-6 border-y border-border py-6" data-testid="company-intelligence-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            <Sparkles className="size-3.5" />
            过来人告诉你什么
          </div>
          <h2 className="mt-3 text-xl font-semibold text-foreground">这家公司,真实经历过的人怎么说</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            方向分保留匿名保护，把薪资、岗位体感、办公体验、认证状态和同行讨论集中到一个决策面板。
          </p>
        </div>
        <SolidButton asChild variant="primary" size="sm">
          <Link href="/submit/review">补一条你的</Link>
        </SolidButton>
      </div>

      <div className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="min-w-0 bg-card p-4 transition hover:bg-muted"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <card.icon className="size-4 text-primary" />
              {card.label}
            </div>
            <p className="mt-3 text-xl font-semibold text-foreground">{card.value}</p>
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
    </section>
  )
}

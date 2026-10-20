import { BadgeDollarSign, Clock3, TrendingUp, UsersRound } from "lucide-react"

import type { CompanyListItem } from "@/lib/types"

function axisLabel(company: CompanyListItem, axis: "pace" | "growth" | "management") {
  const profile = company.cbti
  if (!profile) return "样本积累中"
  if (axis === "pace") return profile.axes.pace === "R" ? "快" : "稳"
  if (axis === "growth") return profile.axes.growth === "G" ? "高" : "中"
  return profile.axes.management === "P" ? "清晰" : "弹性"
}

function axisDetail(company: CompanyListItem, axis: "pace" | "growth" | "management") {
  const profile = company.cbti
  if (!profile) return "等待更多匿名样本"
  if (axis === "pace") return profile.axes.pace === "R" ? "工作节奏偏快" : "节奏相对稳定"
  if (axis === "growth") return profile.axes.growth === "G" ? "评价更常提到成长" : "成长依赖具体团队"
  return profile.axes.management === "P" ? "目标与流程更清晰" : "管理方式因团队而异"
}

export function CompanyDecisionInsights({ company }: { company: CompanyListItem }) {
  const signals = [
    { label: "工作节奏", value: axisLabel(company, "pace"), detail: axisDetail(company, "pace"), icon: Clock3 },
    { label: "成长机会", value: axisLabel(company, "growth"), detail: axisDetail(company, "growth"), icon: TrendingUp },
    { label: "管理", value: axisLabel(company, "management"), detail: axisDetail(company, "management"), icon: UsersRound },
    {
      label: "薪酬福利",
      value: company.salaryRange ? "中上" : "样本积累中",
      detail: company.salaryRange ? `${company.salaryRange.replace(/\s*x\s*/i, " × ")} · 公开样本` : "等待更多匿名样本",
      icon: BadgeDollarSign,
    },
  ]

  return (
    <>
      <section className="web-surface web-surface-base grid grid-cols-2 overflow-hidden lg:grid-cols-4 lg:divide-x lg:divide-border" aria-label="公司关键洞察">
        {signals.map((signal) => {
          const Icon = signal.icon
          return (
            <div key={signal.label} className="bg-card px-4 py-4 sm:px-5 lg:min-h-[128px] lg:px-7 lg:py-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Icon className="size-4 text-foreground" aria-hidden="true" />
                {signal.label}
              </div>
              <p className="mt-2 truncate text-xl font-semibold tracking-tight text-foreground">{signal.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{signal.detail}</p>
            </div>
          )
        })}
      </section>

    </>
  )
}

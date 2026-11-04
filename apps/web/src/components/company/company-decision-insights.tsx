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
      value: company.salaryRange ? "公开薪酬" : "样本积累中",
      detail: company.salaryRange ? `${company.salaryRange.replace(/\s*x\s*/i, " × ")} · 公开样本` : "等待更多匿名样本",
      icon: BadgeDollarSign,
    },
  ]

  return (
    <section aria-label="公司关键洞察">
      <h2 className="text-xl font-semibold">关键洞察</h2>
      {!company.cbti && !company.salaryRange ? (
        <p className="mt-3 border-b border-border pb-6 text-sm text-muted-foreground">样本积累中，等待更多匿名评价后展示工作节奏、成长、管理与薪酬洞察。</p>
      ) : <div className="mt-4 grid grid-cols-2 gap-x-6 border-y border-border min-[1200px]:grid-cols-4">
        {signals.map((signal) => {
          const Icon = signal.icon
          return (
            <div key={signal.label} className="py-5">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className="size-4 text-foreground" aria-hidden="true" />
                {signal.label}
              </div>
              <p className="mt-2 text-lg font-semibold text-foreground">{signal.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{signal.detail}</p>
            </div>
          )
        })}
      </div>}
    </section>
  )
}

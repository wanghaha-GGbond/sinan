import Link from "next/link"
import { ArrowRight, Building2, ShieldCheck, Star, Users } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { ScoreChip } from "@/components/ui/score-chip"
import { companies } from "@/lib/mock-data"

/**
 * Mock list of companies that have been "claimed" by a company account
 * and can be viewed through the company portal. In production this comes
 * from `companies` joined with `company_claims`. For the prototype we
 * just hard-pick two companies so the demo is non-empty.
 */
const CLAIMED_COMPANY_IDS = ["northstar-tech", "polaris-auto"]

export default function CompanyPortalIndexPage() {
  const claimed = companies.filter((c) => CLAIMED_COMPANY_IDS.includes(c.id))
  const unbound = companies.filter((c) => !CLAIMED_COMPANY_IDS.includes(c.id)).slice(0, 3)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">公司控制台</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          查看你公司当前的公开评分、趋势、标签分布与公开评价。
          公司端只能「看镜子」,无法修改评分或影响展示。
        </p>
      </div>

      <SolidCard variant="elevated" className="p-5" data-testid="company-portal-claimed">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">已认领公司</h2>
          <span className="text-xs text-muted-foreground">{claimed.length} 家</span>
        </div>
        {claimed.length === 0 ? (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground">
            你还没有认领任何公司。认领后这里会展示你公司的镜像。
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {claimed.map((company) => (
              <Link
                key={company.id}
                href={`/company-portal/${company.id}`}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 transition hover:border-primary/50 hover:bg-white"
                data-testid={`company-portal-card-${company.id}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-secondary-foreground" />
                    <p className="truncate text-sm font-semibold text-foreground">{company.shortName}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {company.industry} · {company.city} · {company.size}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {company.reviewCount.toLocaleString()} 条公开评价 · {company.recommendationRate}% 推荐
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ScoreChip score={company.directionScore} compact />
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                    打开控制台
                    <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </SolidCard>

      <SolidCard variant="subtle" className="p-5">
        <h2 className="text-base font-semibold text-foreground">公司端能做什么</h2>
        <ul className="mt-3 space-y-2 text-sm text-foreground">
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            查看公司当前方向分、评分趋势、标签分布
          </li>
          <li className="flex items-start gap-2">
            <Users className="mt-0.5 size-4 shrink-0 text-primary" />
            浏览公开评价(只读)
          </li>
          <li className="flex items-start gap-2">
            <Star className="mt-0.5 size-4 shrink-0 text-primary" />
            提交公司基础信息修正(名称、规模、城市、官网等)
          </li>
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            对明显违规评价提交申诉(可附举证)
          </li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          详细权限边界见页脚说明。任何对评价的修改、删改、购买排名的请求都会被司南拒绝。
        </p>
      </SolidCard>

      <SolidCard variant="subtle" className="p-5">
        <h2 className="text-base font-semibold text-foreground">你还没认领的公司</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          提交工商资质后,司南会人工审核并开通控制台。下面是一些示例公司。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {unbound.map((company) => (
            <span
              key={company.id}
              className="rounded-full bg-muted px-3 py-1.5 text-xs text-foreground"
            >
              {company.shortName}
            </span>
          ))}
        </div>
        <div className="mt-4">
          <SolidButton asChild variant="secondary" size="sm">
            <Link href="/search">先看看公开数据</Link>
          </SolidButton>
        </div>
      </SolidCard>
    </div>
  )
}

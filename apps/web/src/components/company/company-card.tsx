import Link from "next/link"
import { ArrowRight, Star } from "lucide-react"

import { companyDisplayScore } from "./company-rating"

import type { CompanyListItem } from "@/lib/api/types"
import type { Company } from "@/lib/types"
import { isDemoCompanyId } from "@/lib/demo-company"

type CompanyCardCompany = Company | CompanyListItem

export function CompanyCard({ company, variant = "directory" }: { company: CompanyCardCompany; variant?: "directory" | "feed" }) {
  const displayName = (company as CompanyListItem).shortName ?? company.name
  const reviewCount = company.reviewCount ?? 0
  const score = companyDisplayScore(company.directionScore, reviewCount)
  const summary = company.description || company.highlights?.slice(0, 2).join(" · ")
  const isFeed = variant === "feed"

  return (
    <Link
      href={`/company/${company.id}`}
      data-testid={isFeed ? "company-feed-item" : "company-directory-item"}
      className={`group flex min-w-0 flex-col bg-card text-foreground transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isFeed ? "border-b border-border px-4 py-6 hover:bg-muted-hover sm:px-6" : "rounded-lg border border-border p-5 shadow-[0_2px_8px_rgba(20,29,34,0.04)] hover:border-emerald-700/35 hover:shadow-[0_5px_18px_rgba(20,29,34,0.08)] sm:p-6"}`}
      aria-label={`查看${displayName}，${score === null ? "暂无评分" : `方向评分 ${score.toFixed(1)} 分（满分 5 分）`}，${reviewCount} 条评价`}
    >
      {isFeed ? <p className="mb-4 text-xs font-medium text-muted-foreground">{isDemoCompanyId(company.id) ? "演示公司" : reviewCount > 0 ? "热门公司" : "新收录公司"}</p> : null}
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-border bg-[#f1f5f3] text-lg font-semibold text-[#245d4b] sm:size-14" aria-hidden="true">{displayName.slice(0, 1)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 text-base font-semibold leading-snug group-hover:underline sm:text-lg">{displayName}</h3>
            {score === null ? <span className="text-sm text-muted-foreground">暂无评分</span> : <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums"><span>{score.toFixed(1)}</span><Star className="size-3.5 fill-current text-[#16704f]" aria-hidden="true" /></span>}
            {isDemoCompanyId(company.id) ? <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">演示</span> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{company.industry} · {company.city}{company.size ? ` · ${company.size}` : ""}</p>
        </div>
      </div>
      {summary ? <p className={`mt-4 text-sm leading-6 text-muted-foreground ${isFeed ? "line-clamp-2" : "line-clamp-1"}`}>{summary}</p> : null}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
        <div className="flex items-start gap-6 sm:gap-8">
          <div><strong className="block text-base font-semibold tabular-nums">{reviewCount.toLocaleString()}</strong><span className="text-xs text-muted-foreground"> 条评价</span></div>
          <div><strong className="block text-base font-semibold tabular-nums">{score === null ? "--" : score.toFixed(1)}</strong><span className="text-xs text-muted-foreground">综合评分 / 5</span></div>
        </div>
        <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-foreground px-4 text-sm font-semibold transition-colors group-hover:bg-foreground group-hover:text-background">查看公司<ArrowRight className="size-4" aria-hidden="true" /></span>
      </div>
    </Link>
  )
}

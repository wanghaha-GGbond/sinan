import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { CompanyRating, companyDisplayScore } from "./company-rating"

import type { CompanyListItem } from "@/lib/api/types"
import type { Company } from "@/lib/types"

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
      className={`group flex min-w-0 flex-col bg-card transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isFeed ? "border-b border-border px-4 py-6 hover:bg-muted-hover sm:px-6" : "rounded-lg border border-border p-5 shadow-[0_2px_8px_rgba(20,29,34,0.04)] hover:border-primary-surface-border hover:shadow-sm sm:p-6"}`}
      aria-label={`查看${displayName}，${score === null ? "暂无评分" : `方向评分 ${score.toFixed(1)} 分（满分 10 分）`}，${reviewCount} 条评价`}
    >
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-primary-surface-border bg-primary-tint text-lg font-semibold text-primary-deep sm:size-14" aria-hidden="true">
          {displayName.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 max-w-full text-base font-semibold leading-snug text-foreground [overflow-wrap:anywhere] group-hover:underline sm:text-lg">{displayName}</h3>
            <CompanyRating score={score} />
          </div>
          <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground sm:text-sm">
            <span>{company.industry}</span>
            <span aria-hidden="true">·</span>
            <span>{company.city}</span>
            {company.size ? <><span aria-hidden="true">·</span><span>{company.size}</span></> : null}
          </p>
        </div>
      </div>
      {summary ? <p className={`mt-4 break-words text-sm leading-6 text-foreground/80 ${isFeed ? "line-clamp-2" : "line-clamp-1"}`}>{summary}</p> : null}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
        <div className="flex items-start gap-6 text-foreground sm:gap-8">
          <div><strong className="block text-base font-semibold tabular-nums">{reviewCount.toLocaleString()}</strong><span className="text-xs text-muted-foreground">条评价</span></div>
          <div><strong className="block text-base font-semibold tabular-nums">{score === null ? "—" : score.toFixed(1)}</strong><span className="text-xs text-muted-foreground">综合评分 / 10</span></div>
        </div>
        <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-foreground px-4 text-sm font-semibold text-foreground group-hover:bg-foreground group-hover:text-background">查看公司<ArrowRight className="size-4" aria-hidden="true" /></span>
      </div>
    </Link>
  )
}

import Link from "next/link"
import { ArrowUpRight, MessageCircle } from "lucide-react"

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
      className={`group flex min-w-0 gap-3 border-b border-border transition-colors hover:bg-muted-hover focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring sm:gap-4 ${isFeed ? "px-4 py-5 sm:px-6" : "py-5 sm:px-3 sm:py-6"}`}
      aria-label={`查看${displayName}，${score === null ? "暂无评分" : `方向评分 ${score.toFixed(1)} 分（满分 5 分）`}，${reviewCount} 条评价`}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-input bg-muted text-base font-semibold text-foreground sm:size-12" aria-hidden="true">
        {displayName.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-snug text-foreground sm:text-lg">{displayName}</h3>
            <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground sm:text-sm">
              <span>{company.industry}</span>
              <span aria-hidden="true">·</span>
              <span>{company.city}</span>
              {company.size ? <><span aria-hidden="true">·</span><span>{company.size}</span></> : null}
            </p>
          </div>
          {!isFeed ? (
            <div className="shrink-0 text-right">
              <CompanyRating score={score} />
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">{reviewCount.toLocaleString()} 条评价</p>
            </div>
          ) : <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />}
        </div>
        {summary ? <p className={`mt-3 text-sm leading-6 text-foreground/80 ${isFeed ? "line-clamp-3" : "line-clamp-1"}`}>{summary}</p> : null}
        {isFeed ? (
          <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
            <CompanyRating score={score} />
            <span className="inline-flex items-center gap-1.5"><MessageCircle className="size-4" aria-hidden="true" />{reviewCount.toLocaleString()} 条评价</span>
            <span className="ml-auto hidden text-sm font-medium text-foreground group-hover:underline sm:inline">查看公司</span>
          </div>
        ) : null}
      </div>
    </Link>
  )
}

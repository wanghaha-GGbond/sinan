import Link from "next/link"
import { ArrowRight, MessageCircle } from "lucide-react"

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
      className={`group flex min-w-0 flex-col bg-card transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isFeed ? "border-b border-border px-4 py-6 hover:bg-muted-hover sm:px-6" : "rounded-lg border border-border p-5 shadow-sm hover:border-primary-surface-border sm:p-6"}`}
      aria-label={`查看${displayName}，${score === null ? "暂无评分" : `方向评分 ${score.toFixed(1)} 分（满分 10 分）`}，${reviewCount} 条评价`}
    >
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-primary-surface-border bg-primary-tint text-lg font-semibold text-primary-deep sm:size-14" aria-hidden="true">
          {displayName.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-semibold leading-snug text-foreground sm:text-lg">{displayName}</h3>
          <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground sm:text-sm">
            <span>{company.industry}</span>
            <span aria-hidden="true">·</span>
            <span>{company.city}</span>
            {company.size ? <><span aria-hidden="true">·</span><span>{company.size}</span></> : null}
          </p>
        </div>
      </div>
      {summary ? <p className={`mt-4 break-words text-sm leading-6 text-foreground/80 ${isFeed ? "line-clamp-2" : "line-clamp-1"}`}>{summary}</p> : null}
      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-5 text-xs text-muted-foreground">
        <CompanyRating score={score} />
        <span className="inline-flex items-center gap-1.5"><MessageCircle className="size-4" aria-hidden="true" />{reviewCount.toLocaleString()} 条评价</span>
        <span className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-3 text-sm font-medium text-foreground group-hover:border-primary group-hover:text-primary-deep">查看公司<ArrowRight className="size-4" aria-hidden="true" /></span>
      </div>
    </Link>
  )
}

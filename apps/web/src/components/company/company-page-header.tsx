import Link from "next/link"
import { ArrowUpRight, ChevronRight, MapPin, PenLine } from "lucide-react"
import { CompanyLogo } from "./company-logo"
import { CompanyRating, companyDisplayScore } from "./company-rating"
import { CompanySectionNav } from "./company-section-nav"
import { WebButton } from "@/components/ui/web-button"
import { publicCompanyWebsite } from "@/lib/company-identity"
import type { CompanyListItem } from "@/lib/types"

export function CompanyPageHeader({ company, active }: { company: CompanyListItem; active: "概览" | "评价" | "评分" | "承诺" }) {
  const count = company.reviewCount ?? 0
  const base = `/company/${encodeURIComponent(company.id)}`
  const website = publicCompanyWebsite(company.website)
  return <>
    <nav aria-label="面包屑" className="mb-3 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      <Link href="/companies" className="inline-flex min-h-11 shrink-0 items-center hover:underline">找公司</Link>
      <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
      {active === "概览" ? <span className="truncate">{company.name}</span> : <Link href={base} className="min-w-0 truncate hover:underline">{company.name}</Link>}
    </nav>
    <header data-testid="company-page-header" className="rounded-xl border border-border bg-card px-5 pt-5 sm:px-7 sm:pt-6">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <CompanyLogo company={company} className="size-14 sm:size-16" />
        <div className="min-w-0 flex-1">
          {active !== "概览" && <Link href={base} className="text-sm font-medium text-muted-foreground hover:underline">{company.name}</Link>}
          <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{active === "概览" ? company.name : `公司${active === "承诺" ? "承诺记录" : active}`}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
            <span>{company.industry}</span><span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden="true" />{company.city}</span>{company.size && <span>{company.size}</span>}
            {company.claimedStatus === "claimed" && <span className="text-primary-deep">企业已认证</span>}
          </p>
        </div>
      </div>
      {active === "概览" && company.description && <p className="mt-4 max-w-2xl break-words text-sm leading-6 text-foreground/80">{company.description}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><CompanyRating score={companyDisplayScore(company.directionScore, count)} prominent /><Link href={`${base}/reviews`} className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:underline">{count.toLocaleString()} 条公开评价</Link></div>
        <div className="flex items-center gap-3">{active === "概览" && website && <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary-deep hover:underline">官网<ArrowUpRight className="size-4" aria-hidden="true" /></a>}
          {active !== "评分" && <WebButton asChild><Link href={`/submit/review?companyId=${encodeURIComponent(company.id)}`}><PenLine className="size-4" aria-hidden="true" />写评价</Link></WebButton>}
        </div>
      </div>
      {count > 0 && <p className="pb-3 text-xs text-muted-foreground">{company.verifiedIdentityCount ?? 0} 位验证贡献者</p>}
      <CompanySectionNav id={company.id} active={active} />
    </header>
  </>
}

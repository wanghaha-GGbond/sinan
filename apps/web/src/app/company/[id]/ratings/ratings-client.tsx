"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, PenLine } from "lucide-react"

import { CompanyEvidenceRail } from "@/components/company/company-evidence-rail"
import { CompanyRating, companyDisplayScore } from "@/components/company/company-rating"
import { CompanySectionNav } from "@/components/company/company-section-nav"
import { WebButton } from "@/components/ui/web-button"
import { ratingReviewHref } from "@/lib/rating-navigation"
import type { CompanyListItem } from "@/lib/types"

export function RatingsClient({ company }: { company: CompanyListItem }) {
  const router = useRouter()
  const [score, setScore] = useState<number | null>(null)
  const reviewCount = company.reviewCount ?? 0
  return (
    <section className="mx-auto w-full max-w-page px-4 py-6 sm:px-6">
      <Link href={`/company/${company.id}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />返回公司</Link>
      <header className="mt-3 rounded-lg border border-border bg-card px-5 pt-5 sm:px-7">
        <p className="text-sm text-muted-foreground">{company.name}</p>
        <div className="flex flex-wrap items-end justify-between gap-4 py-4">
          <h1 className="text-2xl font-semibold">公司评分</h1>
          <div className="flex items-baseline gap-3"><CompanyRating score={companyDisplayScore(company.directionScore, reviewCount)} prominent /><span className="text-sm text-muted-foreground">{reviewCount} 条公开评价</span></div>
        </div>
        <CompanySectionNav id={company.id} active="评分" />
      </header>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 self-start rounded-lg border border-border bg-card p-5 sm:p-7">
          <fieldset>
            <legend className="text-xl font-semibold">你会给几分？</legend>
            <p className="mt-2 text-sm text-muted-foreground">0–10 分</p>
            <div className="mt-5 grid grid-cols-6 gap-2 sm:grid-cols-11">
              {Array.from({ length: 11 }, (_, value) => (
                <label key={value} className="cursor-pointer">
                  <input type="radio" name="direction-score" aria-label={`${value} 分`} value={value} checked={score === value} onChange={() => setScore(value)} className="peer sr-only" />
                  <span className="grid min-h-11 place-items-center rounded-lg border border-border bg-card text-sm font-medium peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">{value}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">{score === null ? "选择你的方向分" : `你的方向分：${score} / 10`}</p>
          <WebButton className="mt-5 w-full sm:w-auto" disabled={score === null} onClick={() => { if (score !== null) router.push(ratingReviewHref(company.id, score)) }}>
            继续提交评价<ArrowRight className="size-4" aria-hidden="true" />
          </WebButton>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">补充经历后提交，审核通过的评价才计入公开评分。</p>
          <div className="mt-6 flex flex-wrap gap-4 border-t border-border pt-4">
            <Link href={`/submit/review?companyId=${encodeURIComponent(company.id)}&questionnaire=1`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary-deep"><PenLine className="size-4" />问卷评分</Link>
            <Link href={`/company/${company.id}/reviews`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-deep">查看评价</Link>
          </div>
        </div>
        <CompanyEvidenceRail company={company} />
      </div>
    </section>
  )
}

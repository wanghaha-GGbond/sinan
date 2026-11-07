"use client"

import Link from "next/link"
import { useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, PenLine } from "lucide-react"

import { CompanyEvidenceRail } from "@/components/company/company-evidence-rail"
import { CompanyDimensionSummaryPanel } from "@/components/company/company-dimension-summary"
import { CompanyPageHeader } from "@/components/company/company-page-header"
import { WebButton } from "@/components/ui/web-button"
import { ratingReviewHref } from "@/lib/rating-navigation"
import type { CompanyListItem } from "@/lib/types"

const subscribeToHydration = () => () => {}
const clientReady = () => true
const serverReady = () => false

export function RatingsClient({ company }: { company: CompanyListItem }) {
  const router = useRouter()
  const hydrated = useSyncExternalStore(subscribeToHydration, clientReady, serverReady)
  const [score, setScore] = useState<number | null>(null)
  return (
    <section className="min-h-[calc(100vh-160px)] bg-muted px-4 py-4 sm:px-8 sm:py-6"><div className="mx-auto w-full max-w-page">
      <CompanyPageHeader company={company} active="评分" />
      <div className="mt-6 grid gap-6 min-[1200px]:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-6">
        <div className="self-start rounded-lg border border-border bg-card p-5 sm:p-7">
          <fieldset disabled={!hydrated} aria-busy={!hydrated}>
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
        <CompanyDimensionSummaryPanel dimensions={company.dimensionSummary} />
        </div>
        <CompanyEvidenceRail company={company} />
      </div>
    </div></section>
  )
}

"use client"

import Link from "next/link"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import type { CompanyListItem, ReviewListItem } from "@/lib/types"
import { CompanyLogo } from "@/components/company/company-logo"
import { WebButton } from "@/components/ui/web-button"
import { ZaichangIcon } from "@/components/ui/zaichang-icon"
import { forumFetch } from "./forum-client"

type ReviewPage = { reviews: ReviewListItem[]; nextCursor: string | null }

export function CompanyReviewFeed({ companyId, companies }: { companyId: string; companies: CompanyListItem[] }) {
  const { user, loading } = useAuth()
  const reviews = useInfiniteQuery({
    queryKey: ["community", "company-reviews", user?.id ?? "anonymous", companyId],
    initialPageParam: "", enabled: !loading, retry: false, staleTime: 0, gcTime: 0,
    queryFn: async ({ pageParam, signal }) => {
      const query = new URLSearchParams({ sort: "latest", limit: "20" })
      if (companyId) query.set("companyId", companyId)
      if (pageParam) query.set("cursor", pageParam)
      const result = await forumFetch<ReviewPage>(`/api/reviews?${query}`, { signal })
      if (!Array.isArray(result.reviews)) throw new Error("评价返回格式不正确")
      return result
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
  })
  const rows = Array.from(new Map((reviews.data?.pages.flatMap(page => page.reviews) ?? []).map(row => [row.id, row])).values())
  const catalog = new Map(companies.map(company => [company.id, company]))
  const reviewHref = `/submit/review${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ""}`
  return <section aria-label="公司评价信息流">
    {reviews.isPending ? <p role="status" className="p-6 text-sm text-muted-foreground">正在加载公司评价…</p>
      : reviews.isError && !reviews.isFetchNextPageError ? <div role="alert" className="p-6"><p>公司评价暂时无法加载</p><WebButton variant="secondary" className="mt-3" onClick={() => void reviews.refetch()}>重试公司评价</WebButton></div>
      : !rows.length ? <div className="px-5 py-10 text-center"><ZaichangIcon name="quiet" className="mx-auto h-24 w-36 text-primary-deep" /><h2 className="mt-3 text-base font-semibold">还没有公开的公司评价</h2><WebButton asChild variant="secondary" className="mt-4"><Link href={reviewHref}>写第一条评价</Link></WebButton></div>
      : rows.map(row => {
        const company = catalog.get(row.companyId)
        const score = typeof row.directionScore === "string" && row.directionScore.trim() ? Number(row.directionScore) : NaN
        return <article key={row.id} data-testid="community-company-review" className="border-b border-border px-4 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            {company ? <CompanyLogo company={company} className="size-10 sm:size-10" /> : <ZaichangIcon name="company" className="size-10 rounded-lg bg-primary-tint p-2 text-primary-deep" />}
            <div className="min-w-0 flex-1"><Link href={`/company/${row.companyId}/reviews`} className="text-sm font-semibold hover:underline">{company?.name ?? "公司评价"}</Link><p className="mt-1 text-xs text-muted-foreground">{row.authorLabel}</p></div>
            <span className="rounded-md bg-primary-tint px-2 py-1 text-sm font-semibold tabular-nums text-primary-deep">{Number.isFinite(score) && score >= 0 && score <= 10 ? <>{score.toFixed(1)}<span className="ml-0.5 text-xs font-normal">/ 10</span></> : "暂无评分"}</span>
          </div>
          <Link href={`/company/${row.companyId}/reviews/${row.id}`} className="mt-3 block focus-visible:outline-2 focus-visible:outline-ring"><h2 className="break-words text-base font-semibold leading-7">{row.title}</h2><p className="mt-1 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85">{row.content ?? "内容暂不可见"}</p></Link>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{row.usefulCount} 人认为有用</span><Link href={`/company/${row.companyId}/reviews/${row.id}`} className="inline-flex min-h-11 items-center gap-2 hover:text-primary-deep"><ZaichangIcon name="reply" className="size-4" />查看评价与讨论</Link></div>
        </article>
      })}
    {reviews.isFetchNextPageError ? <p role="alert" className="p-4 text-sm text-destructive">后续评价加载失败，已加载内容保留。</p> : null}
    {reviews.hasNextPage ? <WebButton variant="secondary" className="m-4" disabled={reviews.isFetchingNextPage} onClick={() => void reviews.fetchNextPage()}>{reviews.isFetchingNextPage ? "正在加载…" : reviews.isFetchNextPageError ? "重试更多评价" : "更多公司评价"}</WebButton> : null}
  </section>
}

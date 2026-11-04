"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowRight, MessageCircle, ThumbsUp } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { WebButton } from "@/components/ui/web-button"
import { WebEmptyState } from "@/components/ui/web-empty-state"
import { useCompanySearch } from "@/lib/queries/company-search"
import { useAuth } from "@/lib/auth-context"
import type { CommunityFeedItem } from "@/lib/community-types"

type SortKey = "useful" | "latest" | "company"

export default function CommunityPage() {
  const searchParams = useSearchParams()
  const selectedCompanyId = searchParams.get("companyId") ?? ""
  const [industry, setIndustry] = useState("all")
  const [city, setCity] = useState("all")
  const [type, setType] = useState<"all" | "question" | "supplement">("all")
  const [sort, setSort] = useState<SortKey>("useful")
  const { user, loading: authLoading } = useAuth()
  const { data: companies = [] } = useCompanySearch()
  const industries = useMemo(() => Array.from(new Set(companies.map((company) => company.industry))).sort(), [companies])
  const cities = useMemo(() => Array.from(new Set(companies.map((company) => company.city))).sort(), [companies])
  const selectedCompany = useMemo(() => companies.find((company) => company.id === selectedCompanyId), [companies, selectedCompanyId])

  const { data: filtered = [], isPending, isError, refetch } = useQuery({
    queryKey: ["community", user?.id ?? "anonymous", selectedCompanyId, industry, city, type, sort],
    enabled: !authLoading,
    queryFn: async ({ signal }): Promise<CommunityFeedItem[]> => {
      const params = new URLSearchParams({ sort })
      if (selectedCompanyId) params.set("companyId", selectedCompanyId)
      if (industry !== "all") params.set("industry", industry)
      if (city !== "all") params.set("city", city)
      if (type !== "all") params.set("type", type)
      const response = await fetch(`/api/community?${params}`, { signal, credentials: "include", cache: "no-store" })
      if (!response.ok) throw new Error("讨论暂时无法加载")
      const body = await response.json()
      return body.discussions
    },
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  })

  return (
    <section className="min-h-[calc(100vh-160px)] bg-muted px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-primary-deep">在场讨论</p>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">社区</h1>
          </div>
          <WebButton asChild variant="primary" size="sm"><Link href="/submit/review">分享经历</Link></WebButton>
        </header>

        <div className="mb-4 flex gap-2" role="group" aria-label="讨论类型">
            {([ ["all", "全部"], ["question", "追问"], ["supplement", "补充"] ] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={type === value} onClick={() => setType(value)} className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${type === value ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-foreground"}`}>{label}</button>
            ))}
        </div>
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-2" aria-label="社区筛选">
          <select aria-label="行业" value={industry} onChange={(event) => setIndustry(event.target.value)} className="min-h-11 max-w-36 shrink-0 rounded-full border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <option value="all">全部行业</option>
            {industries.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select aria-label="城市" value={city} onChange={(event) => setCity(event.target.value)} className="min-h-11 max-w-36 shrink-0 rounded-full border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <option value="all">全部城市</option>
            {cities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select aria-label="排序" value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="min-h-11 shrink-0 rounded-full border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <option value="useful">有用数高</option>
            <option value="latest">最新发布</option>
            <option value="company">公司名 A-Z</option>
          </select>
        </div>
        <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">{isPending ? "正在加载讨论…" : isError ? "讨论加载失败" : `展示 ${filtered.length} 条公开讨论（最多 50 条）`}</p>

        {selectedCompany ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 text-sm"><span>正在看 <strong>{selectedCompany.name}</strong> 的讨论</span><Link href="/community" className="font-medium text-primary-deep hover:underline">查看全部讨论</Link></div> : null}

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
            {isPending ? <p className="p-6 text-sm text-muted-foreground" role="status">正在加载讨论…</p> : isError ? <div className="p-6"><WebEmptyState title="讨论暂时无法加载" action={<WebButton variant="secondary" onClick={() => void refetch()}>重试</WebButton>} /></div> : filtered.length === 0 ? (
              <div className="p-6"><WebEmptyState title={selectedCompany ? "这家公司还没有公开讨论" : "没有匹配的社区讨论"} description="试试其他行业、城市或讨论类型。" action={<WebButton asChild variant="primary" size="sm"><Link href="/submit/review">分享经历</Link></WebButton>} /></div>
            ) : filtered.map((item) => (
              <article key={item.id} id={`discussion-${item.id}`} className="scroll-mt-24 border-b border-border px-5 py-6 last:border-b-0 sm:px-6">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-tint text-sm font-semibold text-primary-deep" aria-hidden="true">{item.authorLabel.slice(0, 1)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 text-sm"><strong className="text-foreground">{item.authorLabel}</strong><span className="text-muted-foreground">· {item.type === "question" ? "追问" : "补充"}</span></div>
                    <Link href={`/company/${item.companyId}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary-deep hover:underline">{item.companyName}<ArrowRight className="size-3" aria-hidden="true" /></Link>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words text-base leading-7 text-foreground">{item.content ?? "内容暂不可见"}</p>
                {item.tags?.length ? <p className="mt-3 text-sm text-primary-deep">{item.tags.slice(0, 3).map((tag) => `#${tag}`).join("  ")}</p> : null}
                <div className="mt-5 flex items-center gap-6 border-t border-border pt-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><ThumbsUp className="size-4" aria-hidden="true" />{item.usefulCount} 有用</span>
                  <Link href={`/company/${item.companyId}/reviews/${item.reviewId}`} className="inline-flex min-h-11 items-center gap-1.5 hover:text-foreground hover:underline"><MessageCircle className="size-4" aria-hidden="true" />查看评价与讨论</Link>
                </div>
              </article>
            ))}
          </div>
          <aside className="hidden self-start lg:block" aria-label="探索更多">
            <h2 className="text-base font-semibold">探索更多</h2>
            <Link href="/companies" className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary-deep hover:underline">浏览公司<ArrowRight className="size-4" aria-hidden="true" /></Link>
          </aside>
        </div>
      </div>
    </section>
  )
}

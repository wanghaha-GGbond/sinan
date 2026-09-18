"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/common/filter-bar"
import { WebButton } from "@/components/ui/web-button"
import { WebSurface } from "@/components/ui/web-surface"
import { WebEmptyState } from "@/components/ui/web-empty-state"
import { getCommunityInsights } from "@/lib/glassdoor-insights"
import { companies, reviewDiscussions } from "@/lib/mock-data"

type SortKey = "useful" | "company"
const SORT_OPTIONS = [
  { value: "useful", label: "有用数高" },
  { value: "company", label: "公司名 A-Z" },
] as const

export default function CommunityPage() {
  const searchParams = useSearchParams()
  const selectedCompanyId = searchParams.get("companyId") ?? ""
  const [industry, setIndustry] = useState<string>("all")
  const [city, setCity] = useState<string>("all")
  const [type, setType] = useState<"all" | "question" | "supplement">("all")
  const [sort, setSort] = useState<SortKey>("useful")

  const allDiscussions = useMemo(
    () => getCommunityInsights(companies, reviewDiscussions),
    []
  )

  const industries = useMemo(
    () => Array.from(new Set(companies.map((c) => c.industry))).sort(),
    []
  )
  const cities = useMemo(
    () => Array.from(new Set(companies.map((c) => c.city))).sort(),
    []
  )
  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId),
    [selectedCompanyId]
  )

  const filtered = useMemo(() => {
    const companyById = new Map(companies.map((c) => [c.id, c]))
    const matched = allDiscussions.filter((item) => {
      const c = companyById.get(item.companyId)
      if (selectedCompanyId && item.companyId !== selectedCompanyId) return false
      if (industry !== "all" && c?.industry !== industry) return false
      if (city !== "all" && c?.city !== city) return false
      if (type !== "all" && item.type !== type) return false
      return true
    })
    matched.sort((a, b) => {
      if (sort === "useful") return b.usefulCount - a.usefulCount
      return a.companyName.localeCompare(b.companyName, "zh")
    })
    return matched
  }, [allDiscussions, selectedCompanyId, industry, city, type, sort])

  return (
    <section className="mx-auto flex w-full max-w-page flex-col gap-5 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">社区</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("question")}
            className={`min-h-9 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              type === "question"
                ? "bg-foreground text-background shadow-[0_3px_0_rgba(17,24,39,0.18)]"
                : "border border-border/60 bg-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            追问
          </button>
          <button
            type="button"
            onClick={() => setType("supplement")}
            className={`min-h-9 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              type === "supplement"
                ? "bg-foreground text-background shadow-[0_3px_0_rgba(17,24,39,0.18)]"
                : "border border-border/60 bg-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            补充
          </button>
          {type !== "all" && (
            <button
              type="button"
              onClick={() => setType("all")}
              className="min-h-9 rounded-xl border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              全部
            </button>
          )}
        </div>
      </div>

      {selectedCompany ? (
        <div className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">正在看 {selectedCompany.name} 的讨论</p>
            <p className="mt-1 text-xs text-muted-foreground">
              共 {filtered.length} 条公开追问与补充
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <WebButton asChild variant="primary" size="sm">
              <Link href={`/company/${selectedCompany.id}`}>查看公司</Link>
            </WebButton>
            <WebButton asChild variant="secondary" size="sm">
              <Link href="/community">查看全部讨论</Link>
            </WebButton>
          </div>
        </div>
      ) : null}

      <FilterBar
        industries={industries}
        cities={cities}
        sortOptions={SORT_OPTIONS}
        industry={industry}
        city={city}
        sort={sort}
        resultCount={filtered.length}
        onChangeIndustry={setIndustry}
        onChangeCity={setCity}
        onChangeSort={setSort}
        onReset={() => {
          setIndustry("all")
          setCity("all")
          setType("all")
          setSort("useful")
        }}
      />

      {filtered.length === 0 ? (
        <WebEmptyState
          title={selectedCompany ? "这家公司还没有公开讨论" : "没有匹配的社区讨论"}
          description={
            selectedCompany
              ? "可以先查看公司评价，再围绕具体经历发起追问。"
              : "换一个行业或城市,或者发起新评价。在场的追问空间依赖你。"
          }
          action={
            <WebButton asChild variant="primary" size="sm">
              <Link href={selectedCompany ? `/company/${selectedCompany.id}` : "/submit/review"}>
                {selectedCompany ? "查看公司评价" : "发起新评价"}
              </Link>
            </WebButton>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((item) => (
            <WebSurface
              key={item.discussionId}
              id={`discussion-${item.discussionId}`}
              variant="default"
              className="scroll-mt-24 p-5"
            >
              {/* Company + type badge + useful count */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{item.companyName}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {item.type === "question" ? "追问" : "补充"}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">有用 {item.usefulCount}</span>
              </div>

              {/* Content */}
              <p className="mb-4 text-sm leading-7 text-foreground">{item.content}</p>

              {/* Tags + author */}
              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">{item.authorLabel}</span>
              </div>
            </WebSurface>
          ))}
        </div>
      )}
    </section>
  )
}

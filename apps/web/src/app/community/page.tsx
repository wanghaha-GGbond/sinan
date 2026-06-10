"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, MessageCircleQuestion, UsersRound } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { FilterBar } from "@/components/common/filter-bar"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { TagPill } from "@/components/ui/tag-pill"
import { getCommunityInsights } from "@/lib/glassdoor-insights"
import { companies, reviewDiscussions } from "@/lib/mock-data"

type SortKey = "useful" | "company"
const SORT_OPTIONS = [
  { value: "useful", label: "有用数高" },
  { value: "company", label: "公司名 A-Z" },
] as const
const TYPE_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "question", label: "追问" },
  { value: "supplement", label: "补充" },
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
      <SolidCard variant="elevated" className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              <UsersRound className="size-3.5" />
              社区问答
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">把评价后面的追问也看见</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Glassdoor 式社区能力映射到司南:围绕一条评价继续追问、补充、打码展示,并保留匿名身份保护。
            </p>
          </div>
          <SolidButton asChild variant="primary">
            <Link href="/submit/review">发起新评价</Link>
          </SolidButton>
        </div>
      </SolidCard>

      {selectedCompany ? (
        <div className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">正在看 {selectedCompany.name} 的讨论</p>
            <p className="mt-1 text-xs text-muted-foreground">
              共 {filtered.length} 条公开追问与补充
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SolidButton asChild variant="primary" size="sm">
              <Link href={`/company/${selectedCompany.id}`}>查看公司</Link>
            </SolidButton>
            <SolidButton asChild variant="secondary" size="sm">
              <Link href="/community">查看全部讨论</Link>
            </SolidButton>
          </div>
        </div>
      ) : null}

      {/* Type filter as inline pill toggle — orthogonal to the 3 standard filters. */}
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="讨论类型">
        <span className="text-xs font-semibold text-muted-foreground">类型</span>
        {TYPE_OPTIONS.map((opt) => {
          const selected = type === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setType(opt.value)}
              data-testid={`community-type-${opt.value}`}
              className={`min-h-11 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selected
                  ? "bg-foreground text-white shadow-[0_3px_0_rgba(17,24,39,0.18)]"
                  : "bg-muted text-foreground hover:bg-muted-hover"
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

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
        <SolidEmptyState
          title={selectedCompany ? "这家公司还没有公开讨论" : "没有匹配的社区讨论"}
          description={
            selectedCompany
              ? "可以先查看公司评价，再围绕具体经历发起追问。"
              : "换一个行业或城市,或者发起新评价。司南的追问空间依赖你。"
          }
          action={
            <SolidButton asChild variant="primary" size="sm">
              <Link href={selectedCompany ? `/company/${selectedCompany.id}` : "/submit/review"}>
                {selectedCompany ? "查看公司评价" : "发起新评价"}
              </Link>
            </SolidButton>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <SolidCard
              key={item.discussionId}
              id={`discussion-${item.discussionId}`}
              variant="subtle"
              className="scroll-mt-24 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.companyName}</p>
                  <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                    <span>{item.type === "question" ? "追问" : "补充"}</span>
                    <span>{item.authorLabel}</span>
                  </p>
                </div>
                <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  有用 {item.usefulCount}
                </div>
              </div>
              <div className="mt-4 rounded-[24px] bg-white p-4 text-sm leading-6 text-foreground">
                <MessageCircleQuestion className="mb-2 size-4 text-primary" />
                {item.content}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.tags.slice(0, 3).map((tag) => (
                  <TagPill
                    key={tag}
                    tone={tag.includes("面试") || tag.includes("薪资") ? "match" : "neutral"}
                  >
                    #{tag}
                  </TagPill>
                ))}
              </div>
              <div className="mt-4">
                <SolidButton asChild variant="primary" size="sm">
                  <Link href={`/company/${item.companyId}`}>
                    看公司讨论
                    <ArrowRight className="size-4" />
                  </Link>
                </SolidButton>
              </div>
            </SolidCard>
          ))}
        </div>
      )}
    </section>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Search, Sparkles, Building2, TrendingUp, ArrowRight } from "lucide-react"

import { CompanyCard } from "@/components/company/company-card"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { SolidSearchInput } from "@/components/ui/solid-search-input"
import { searchCompanies } from "@/lib/api/companies"
import type { CompanyListItem } from "@/lib/api/types"
import { popularSearches, recommendedCompanyItems } from "@/lib/mock-data"

const STOPWORDS = ["公司", "有限", "股份", "集团", "科技", "网络", "信息", "(", ")", "（", "）", " ", "的"]

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [results, setResults] = useState<CompanyListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // fetch when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to empty on cleared query
      setResults([])
      // setLoading(false) omitted: initial state is already false
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    searchCompanies({ q: debouncedQuery }).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (res.error) {
        setError(res.error)
      } else {
        setResults(res.data?.companies ?? [])
      }
    })
    return () => { cancelled = true }
  }, [debouncedQuery])

  return (
    <section className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">搜索公司</h1>
        <p className="mt-2 text-sm text-muted-foreground">知道公司名时再搜，推荐流仍是主入口。</p>
      </div>

      <div className="space-y-3">
        <SolidSearchInput value={query} onChange={setQuery} />
        <div className="flex flex-wrap gap-2">
          {popularSearches.map((item) => (
            <SolidButton key={item} type="button" variant="secondary" size="sm" onClick={() => setQuery(item)}>
              {item}
            </SolidButton>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">搜索中...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && results.length === 0 && debouncedQuery.trim() ? (
        <SmartEmptyState
          query={debouncedQuery.trim()}
          onSubmit={(text) => setQuery(text)}
        />
      ) : null}
      {!loading && results.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "var(--container-card-grid)" }}>
          {results.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}

      <div>
        <SolidButton asChild variant="ghost" size="sm">
          <Link href="/">返回推荐流</Link>
        </SolidButton>
      </div>
    </section>
  )
}

function SmartEmptyState({ query, onSubmit }: { query: string; onSubmit: (text: string) => void }) {
  // Try 3 retrieval strategies and surface the best matches as
  // suggestions, instead of just 'no results'. This is what
  // Linear / Notion / Vercel do — 'empty' is a chance to be
  // useful, not just to apologize.
  const suggestions = useMemo(() => {
    const clean = query
      .split("")
      .filter((c) => !STOPWORDS.includes(c))
      .join("")
      .toLowerCase()
    if (!clean) return []
    return recommendedCompanyItems
      .filter((c) => c.companyName.toLowerCase().includes(clean) || c.industry.includes(query))
      .slice(0, 3)
  }, [query])

  return (
    <div>
      <SolidEmptyState
        title="没有找到这家公司"
        description="你可以提交公司注册信息，审核通过后开放评价。"
        action={
          <SolidButton asChild variant="primary">
            <Link href={`/submit/review?mode=add-company&name=${encodeURIComponent(query)}`}>添加公司</Link>
          </SolidButton>
        }
      />
      <div className="mt-6 space-y-4 text-left">
        {suggestions.length > 0 ? (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Sparkles className="size-3" />
              你是不是要找
            </p>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {suggestions.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSubmit(c.companyName)}
                    className="flex w-full min-h-11 items-center gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-2 text-left text-sm transition hover:border-primary hover:bg-primary-tint/50"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary-deep">
                      <Building2 className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground">{c.companyName}</span>
                    <span className="text-xs text-muted-foreground">{c.industry}</span>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <Search className="size-3" />
            换个关键词试试
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {popularSearches.slice(0, 6).map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => onSubmit(term)}
                className="min-h-11 rounded-full bg-muted px-3.5 py-1.5 text-sm text-foreground transition hover:bg-muted-hover"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <TrendingUp className="size-3" />
            看本周榜单
          </p>
          <Link
            href="/rankings"
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-foreground/90"
          >
            打开排行榜
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Search, TrendingUp, ArrowRight } from "lucide-react"

import { CompanyCard } from "@/components/company/company-card"
import { WebButton } from "@/components/ui/web-button"
import { WebEmptyState } from "@/components/ui/web-empty-state"
import { WebSearchField } from "@/components/ui/web-search-field"
import { searchCompanies } from "@/lib/api/companies"
import type { CompanyListItem } from "@/lib/api/types"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [results, setResults] = useState<CompanyListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Suggestion chips must come from the live catalog: hardcoded popular names
  // led every click to the empty state while the company set was small.
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    searchCompanies({}).then((res) => {
      if (cancelled || res.error) return
      const names = (res.data?.companies ?? [])
        .map((company) => company.shortName || company.name)
        .filter((name): name is string => Boolean(name))
      setSuggestions(names.slice(0, 6))
    })
    return () => { cancelled = true }
  }, [])

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

  function submitSearch() {
    setDebouncedQuery(query)
  }

  return (
    <section className="mx-auto flex w-full max-w-page flex-col gap-7 px-4 py-8 sm:px-6 lg:py-10">
      <div>
        <p className="text-sm font-semibold text-primary-deep">找公司</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">先找到你真正想了解的公司。</h1>
        <p className="mt-3 text-sm text-muted-foreground">搜索公司名、行业或岗位，先看评分，再读真实经历。</p>
      </div>

      <div className="max-w-4xl space-y-3">
        <WebSearchField value={query} onChange={setQuery} onSubmit={submitSearch} />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((item) => (
              <WebButton key={item} type="button" variant="secondary" size="sm" onClick={() => { setQuery(item); setDebouncedQuery(item) }}>
                {item}
              </WebButton>
            ))}
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">搜索中...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && results.length === 0 && debouncedQuery.trim() ? (
        <SmartEmptyState
          query={debouncedQuery.trim()}
          suggestions={suggestions.filter((term) => term !== debouncedQuery.trim())}
          onSubmit={setQuery}
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
        <WebButton asChild variant="quiet" size="sm">
          <Link href="/">返回推荐流</Link>
        </WebButton>
      </div>
    </section>
  )
}

function SmartEmptyState({ query, suggestions, onSubmit }: { query: string; suggestions: string[]; onSubmit: (text: string) => void }) {
  return (
    <div>
      <WebEmptyState
        title="没有找到这家公司"
        description="你可以提交公司注册信息，审核通过后开放评价。"
        action={
          <WebButton asChild variant="primary">
            <Link href={`/submit/review?mode=add-company&name=${encodeURIComponent(query)}`}>添加公司</Link>
          </WebButton>
        }
      />
      <div className="mt-6 space-y-4 text-left">
        {suggestions.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Search className="size-3" />
              换个关键词试试
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {suggestions.slice(0, 6).map((term) => (
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
        )}

        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <TrendingUp className="size-3" />
            看本周榜单
          </p>
          <WebButton asChild variant="secondary" size="sm" className="mt-2">
            <Link href="/rankings">打开排行榜<ArrowRight className="size-3.5" /></Link>
          </WebButton>
        </div>
      </div>
    </div>
  )
}

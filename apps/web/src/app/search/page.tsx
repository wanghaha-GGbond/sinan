"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Search, TrendingUp, ArrowRight } from "lucide-react"

import { CompanyCard } from "@/components/company/company-card"
import { WebButton } from "@/components/ui/web-button"
import { WebEmptyState } from "@/components/ui/web-empty-state"
import { WebSearchField } from "@/components/ui/web-search-field"
import { useCompanySearch } from "@/lib/queries/company-search"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const catalogQuery = useCompanySearch()
  const searchQuery = useCompanySearch(
    { q: debouncedQuery },
    Boolean(debouncedQuery.trim()),
  )
  const suggestions = useMemo(() => {
    const names = (catalogQuery.data ?? [])
      .map((company) => company.shortName || company.name)
      .filter((name): name is string => Boolean(name))
    return names.slice(0, 6)
  }, [catalogQuery.data])

  // debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const hasQuery = Boolean(debouncedQuery.trim())
  const results = hasQuery ? searchQuery.data ?? [] : []
  const loading = hasQuery && searchQuery.isFetching
  const error = hasQuery && searchQuery.error instanceof Error ? searchQuery.error.message : null

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

      {loading && <p role="status" className="text-sm text-muted-foreground">{results.length ? "正在更新搜索结果…" : "搜索中..."}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && results.length === 0 && debouncedQuery.trim() ? (
        <SmartEmptyState
          query={debouncedQuery.trim()}
          suggestions={suggestions.filter((term) => term !== debouncedQuery.trim())}
          onSubmit={setQuery}
        />
      ) : null}
      {results.length > 0 && (
        <div aria-busy={loading} className="grid gap-4" style={{ gridTemplateColumns: "var(--container-card-grid)" }}>
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

"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Search, TrendingUp, ArrowRight } from "lucide-react"

import { CompanyCard } from "@/components/company/company-card"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { SolidSearchInput } from "@/components/ui/solid-search-input"
import { searchCompanies } from "@/lib/api/companies"
import type { CompanyListItem } from "@/lib/api/types"
const popularSearches = ["字节跳动", "腾讯", "阿里巴巴", "小红书", "美团", "华为"]

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
        <SolidButton asChild variant="ghost" size="sm">
          <Link href="/">返回推荐流</Link>
        </SolidButton>
      </div>
    </section>
  )
}

function SmartEmptyState({ query, onSubmit }: { query: string; onSubmit: (text: string) => void }) {
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

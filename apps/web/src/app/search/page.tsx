"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { CompanyCard } from "@/components/company/company-card"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { SolidSearchInput } from "@/components/ui/solid-search-input"
import { searchCompanies } from "@/lib/api/companies"
import type { CompanyListItem } from "@/lib/api/types"
import { popularSearches } from "@/lib/mock-data"

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
      setResults([])
      setLoading(false)
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
    <section className="mx-auto flex w-full max-w-[920px] flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">搜索公司</h1>
        <p className="mt-2 text-sm text-[#6B7280]">知道公司名时再搜，推荐流仍是主入口。</p>
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

      {loading && <p className="text-sm text-[#6B7280]">搜索中...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && results.length === 0 && debouncedQuery.trim() && (
        <SolidEmptyState
          title="没有找到这家公司"
          description="你可以提交公司注册信息，审核通过后开放评价。"
          action={
            <SolidButton asChild variant="primary">
              <Link href={`/submit/review?mode=add-company&name=${encodeURIComponent(debouncedQuery.trim())}`}>添加公司</Link>
            </SolidButton>
          }
        />
      )}
      {!loading && results.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
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
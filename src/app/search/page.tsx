"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { CompanyCard } from "@/components/company/company-card"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { SolidSearchInput } from "@/components/ui/solid-search-input"
import { popularSearches, searchCompanies } from "@/lib/mock-data"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const companies = useMemo(() => searchCompanies(query), [query])

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

      {companies.length === 0 ? (
        <SolidEmptyState title="还没有相关评价。" description="成为第一个为后来者补上这段经历的人。" />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {companies.map((company) => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>

      <div>
        <SolidButton asChild variant="ghost" size="sm">
          <Link href="/">返回推荐流</Link>
        </SolidButton>
      </div>
    </section>
  )
}

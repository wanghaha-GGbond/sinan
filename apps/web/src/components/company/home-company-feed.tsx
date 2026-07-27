"use client"

import { useEffect, useState } from "react"

import { searchCompanies } from "@/lib/api/companies"
import type { CompanyListItem } from "@/lib/api/types"

import { CompanyCard } from "./company-card"

export function HomeCompanyFeed() {
  const [companies, setCompanies] = useState<CompanyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    searchCompanies({}).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (result.error) {
        setError("公司数据暂时不可用，请稍后再试")
        return
      }
      setCompanies(result.data?.companies.slice(0, 6) ?? [])
    })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div className="h-40 animate-pulse rounded-3xl bg-muted" aria-label="正在加载公司" />
  }

  if (error) {
    return <p className="rounded-2xl border p-5 text-sm text-muted-foreground" role="status">{error}</p>
  }

  if (companies.length === 0) {
    return <p className="rounded-2xl border p-5 text-sm text-muted-foreground">首批公司正在审核入库，欢迎稍后再来。</p>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {companies.map((company) => <CompanyCard key={company.id} company={company} />)}
    </div>
  )
}

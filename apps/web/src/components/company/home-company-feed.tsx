"use client"

import { useEffect, useState } from "react"

import { WebButton } from "@/components/ui/web-button"
import { searchCompanies } from "@/lib/api/companies"
import type { CompanyListItem } from "@/lib/api/types"

import { CompanyCard } from "./company-card"

export function HomeCompanyFeed() {
  const [companies, setCompanies] = useState<CompanyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    searchCompanies({}).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (result.error) {
        setCompanies([])
        setError("公司数据暂时不可用，请稍后再试")
        return
      }
      setError(null)
      setCompanies(result.data?.companies.slice(0, 6) ?? [])
    })
    return () => { cancelled = true }
  }, [reloadCount])

  function retry() {
    setLoading(true)
    setReloadCount((count) => count + 1)
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-3xl bg-muted" aria-label="正在加载公司" />
  }

  if (error) {
    return (
      <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border p-5">
        <p className="text-sm text-muted-foreground">{error}</p>
        <WebButton type="button" variant="secondary" size="sm" onClick={retry}>重试</WebButton>
      </div>
    )
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

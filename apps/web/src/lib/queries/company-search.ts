"use client"

import { useQuery, type QueryClient } from "@tanstack/react-query"

import { searchCompanies } from "@/lib/api/companies"
import type { CompanyListItem } from "@/lib/types"

export type CompanySearchParams = {
  q?: string
  city?: string
  industry?: string
}

function normalizeParams(params: CompanySearchParams = {}) {
  return {
    q: params.q?.trim() ?? "",
    city: params.city?.trim() ?? "",
    industry: params.industry?.trim() ?? "",
  }
}

export function companySearchQueryKey(params: CompanySearchParams = {}) {
  const normalized = normalizeParams(params)
  return ["companies", "search", normalized.q, normalized.city, normalized.industry] as const
}

async function fetchCompanySearch(params: CompanySearchParams): Promise<CompanyListItem[]> {
  const result = await searchCompanies(params)
  if (result.error) throw new Error(result.error)
  return result.data?.companies ?? []
}

const companySearchOptions = (params: CompanySearchParams = {}) => ({
  queryKey: companySearchQueryKey(params),
  queryFn: () => fetchCompanySearch(params),
  staleTime: 60_000,
  gcTime: 10 * 60_000,
  // Keep the previous result visible while a new search is in flight.
  placeholderData: (previousData: CompanyListItem[] | undefined) => previousData,
})

export function useCompanySearch(params: CompanySearchParams = {}, enabled = true) {
  return useQuery({
    ...companySearchOptions(params),
    enabled,
  })
}

export function prefetchCompanySearch(queryClient: QueryClient, params: CompanySearchParams = {}) {
  return queryClient.prefetchQuery(companySearchOptions(params))
}

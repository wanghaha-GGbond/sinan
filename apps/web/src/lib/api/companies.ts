import type { CompanyListItem, ApiResponse } from '@/lib/types'

export async function getCompany(id: string): Promise<ApiResponse<{ company: CompanyListItem }>> {
  try {
    const res = await fetch(`/api/companies/${id}`, { credentials: 'include' })
    if (!res.ok) {
      return { data: null, loading: false, error: `HTTP ${res.status}` }
    }
    const json = await res.json()
    return { data: json, loading: false, error: null }
  } catch (e: unknown) {
    return { data: null, loading: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function searchCompanies(params: {
  q?: string; city?: string; industry?: string
}): Promise<ApiResponse<{ companies: CompanyListItem[] }>> {
  try {
    const qs = new URLSearchParams()
    if (params.q) qs.set('q', params.q)
    if (params.city) qs.set('city', params.city)
    if (params.industry) qs.set('industry', params.industry)
    const url = `/api/companies/search?${qs.toString()}`
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) {
      return { data: null, loading: false, error: `HTTP ${res.status}` }
    }
    const json = await res.json()
    return { data: json, loading: false, error: null }
  } catch (e: unknown) {
    return { data: null, loading: false, error: e instanceof Error ? e.message : String(e) }
  }
}
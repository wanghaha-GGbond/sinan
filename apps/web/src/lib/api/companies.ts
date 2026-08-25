import type { CompanyListItem, ApiResponse } from '@/lib/types'
import { companies as mockCompanies } from '@/lib/mock-data'

function toListItem(company: (typeof mockCompanies)[number]): CompanyListItem {
  return {
    id: company.id,
    name: company.name,
    registeredName: company.registeredName ?? company.name,
    shortName: company.shortName,
    englishName: company.englishName ?? null,
    aliases: company.alias ?? null,
    city: company.city,
    industry: company.industry,
    size: company.size,
    financingStage: company.financingStage ?? company.stage,
    website: company.website ?? null,
    logoUrl: company.logoUrl ?? null,
    description: company.description ?? null,
    reviewStatus: company.reviewStatus ?? 'reviewable',
    claimedStatus: company.claimedStatus,
    verifiedIdentityCount: company.verifiedIdentityCount,
    source: company.source === 'mock' ? 'platform_seed' : company.source ?? 'platform_seed',
    businessStatus: company.businessStatus ?? null,
    foundedDate: company.foundedDate ?? null,
    unifiedSocialCreditCode: company.unifiedSocialCreditCode ?? null,
    registeredAddress: company.registeredAddress ?? null,
    legalRepresentative: company.legalRepresentative ?? null,
    createdAt: company.createdAt ?? new Date(0).toISOString(),
    updatedAt: company.updatedAt ?? new Date(0).toISOString(),
    directionScore: company.directionScore,
    recommendationRate: company.recommendationRate,
    reviewCount: company.reviewCount,
    salaryRange: company.salaryRange,
    riskLevel: company.riskLevel,
    riskTags: company.riskTags,
    highlights: company.highlights,
  }
}

export async function getCompany(id: string): Promise<ApiResponse<{ company: CompanyListItem }>> {
  try {
    const res = await fetch(`/api/companies/${id}`, { credentials: 'include' })
    if (!res.ok) {
      const fallback = mockCompanies.find((company) => company.id === id)
      return fallback
        ? { data: { company: toListItem(fallback) }, loading: false, error: null }
        : { data: null, loading: false, error: `HTTP ${res.status}` }
    }
    const json = await res.json()
    return { data: json, loading: false, error: null }
  } catch (e: unknown) {
    const fallback = mockCompanies.find((company) => company.id === id)
    return fallback
      ? { data: { company: toListItem(fallback) }, loading: false, error: null }
      : { data: null, loading: false, error: e instanceof Error ? e.message : String(e) }
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
      throw new Error(`HTTP ${res.status}`)
    }
    const json = await res.json()
    return { data: json, loading: false, error: null }
  } catch {
    const query = params.q?.trim().toLowerCase() ?? ''
    const fallback = mockCompanies
      .filter((company) => company.reviewStatus !== 'rejected')
      .filter((company) => !params.city || company.city === params.city)
      .filter((company) => !params.industry || company.industry === params.industry)
      .filter((company) => {
        if (!query) return true
        return [company.name, company.shortName, company.englishName, ...(company.alias ?? [])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      })
      .map(toListItem)
    return { data: { companies: fallback }, loading: false, error: null }
  }
}

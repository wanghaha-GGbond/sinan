/**
 * Companies data access layer.
 *
 * All company data reads/writes go through this module. Pages should import
 * from here instead of directly from `@/lib/mock-data`.
 *
 * When NEXT_PUBLIC_API_ENABLED is "true", functions call the real API.
 * Otherwise they fall back to the existing mock data — ensuring local
 * development and e2e tests continue to work without a database.
 */
import type { Company } from "@/lib/types"
import { companies as mockCompanies, searchCompanies as mockSearch } from "@/lib/mock-data"

const API_ENABLED =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_API_ENABLED === "true"

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export type SearchCompaniesOptions = {
  city?: string
  industry?: string
}

export async function searchCompaniesData(
  query: string,
  options?: SearchCompaniesOptions
): Promise<Company[]> {
  if (API_ENABLED) {
    try {
      const params = new URLSearchParams()
      if (query) params.set("q", query)
      if (options?.city) params.set("city", options.city)
      if (options?.industry) params.set("industry", options.industry)

      const res = await fetch(`/api/companies/search?${params.toString()}`, {
        credentials: "include",
      })
      if (!res.ok) return []
      const data = await res.json()
      return (data.companies ?? []) as Company[]
    } catch {
      // Fall through to mock fallback on network error
    }
  }

  return mockSearch(query)
}

// ---------------------------------------------------------------------------
// Community submission
// ---------------------------------------------------------------------------

export type SubmitCompanyInput = {
  registeredName: string
  unifiedSocialCreditCode: string
  registeredAddress: string
  legalRepresentative: string
  city: string
  industry: string
  shortName?: string
  englishName?: string
  website?: string
  size?: string
  financingStage?: string
  businessStatus?: string
  foundedDate?: string
  note?: string
}

export type SubmitCompanyResult =
  | { ok: true; company: Company }
  | { ok: false; error: string; details?: Record<string, string> }

export async function submitCompanyCommunitySubmission(
  input: SubmitCompanyInput
): Promise<SubmitCompanyResult> {
  if (API_ENABLED) {
    try {
      const res = await fetch("/api/companies/community-submissions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      const data = await res.json()

      if (!res.ok) {
        return {
          ok: false,
          error: data.error ?? "Submission failed",
          details: data.details,
        }
      }

      return { ok: true, company: data.company as Company }
    } catch {
      // Fall through to mock fallback
    }
  }

  // Mock fallback: create a local company object
  const mockCompany: Company = {
    id: `company-local-${Date.now()}`,
    name: input.shortName || input.registeredName,
    registeredName: input.registeredName,
    shortName: input.shortName || input.registeredName,
    unifiedSocialCreditCode: input.unifiedSocialCreditCode,
    registeredAddress: input.registeredAddress,
    legalRepresentative: input.legalRepresentative,
    city: input.city,
    industry: input.industry,
    size: input.size ?? "",
    stage: input.financingStage ?? "",
    directionScore: 0,
    recommendationRate: 0,
    reviewCount: 0,
    salaryRange: "",
    riskLevel: "低",
    riskTags: [],
    trustLevel: "",
    highlights: [],
    compassBriefs: [],
    lowScoreReasons: [],
    recommendationReasons: [],
    dimensions: [],
    scoreDistribution: [],
    trend: [],
    reviews: [],
    claimedStatus: "unclaimed",
    source: "user_added",
    pendingReview: true,
    reviewStatus: "pending_review",
    createdByUser: true,
  }

  // Add to mock companies list so it appears in search
  mockCompanies.push(mockCompany)

  return { ok: true, company: mockCompany }
}

// ---------------------------------------------------------------------------
// My submissions
// ---------------------------------------------------------------------------

export async function getMyCompanySubmissions(): Promise<Company[]> {
  if (API_ENABLED) {
    try {
      const res = await fetch("/api/me/company-submissions")
      if (!res.ok) return []
      const data = await res.json()
      return (data.submissions ?? []) as Company[]
    } catch {
      return []
    }
  }

  // Mock fallback: return user-created companies
  return mockCompanies.filter((c) => c.createdByUser === true)
}

// Re-export mock functions for direct access during migration
export { mockCompanies as _mockCompanies, mockSearch as _mockSearch }

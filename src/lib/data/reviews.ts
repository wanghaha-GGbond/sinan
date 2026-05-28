/**
 * Reviews data access layer.
 *
 * All review data reads/writes go through this module. Pages should import
 * from here instead of directly from `@/lib/mock-data`.
 *
 * When NEXT_PUBLIC_API_ENABLED is "true", functions call the real API.
 * Otherwise they fall back to the existing mock data — ensuring local
 * development and e2e tests continue to work without a database.
 */
import type { Review } from "@/lib/types"
import {
  getCompany,
  createLocalDiscussion,
} from "@/lib/mock-data"

const API_ENABLED =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_API_ENABLED === "true"

// ---------------------------------------------------------------------------
// Get company reviews
// ---------------------------------------------------------------------------

export type GetCompanyReviewsOptions = {
  sort?: "useful" | "latest"
  limit?: number
  cursor?: string
}

export type GetCompanyReviewsResult = {
  reviews: Review[]
  nextCursor: string | null
}

export async function getCompanyReviewsData(
  companyId: string,
  options?: GetCompanyReviewsOptions
): Promise<GetCompanyReviewsResult> {
  if (API_ENABLED) {
    try {
      const params = new URLSearchParams()
      if (options?.sort) params.set("sort", options.sort)
      if (options?.limit) params.set("limit", String(options.limit))
      if (options?.cursor) params.set("cursor", options.cursor)

      const res = await fetch(
        `/api/companies/${companyId}/reviews?${params.toString()}`
      )
      if (!res.ok) return { reviews: [], nextCursor: null }
      const data = await res.json()
      return {
        reviews: (data.reviews ?? []) as Review[],
        nextCursor: data.nextCursor ?? null,
      }
    } catch {
      // Fall through to mock fallback on network error
    }
  }

  // Mock fallback: return reviews from mock-data
  const company = getCompany(companyId)
  if (!company) return { reviews: [], nextCursor: null }

  const sorted = [...company.reviews]

  if (options?.sort === "latest") {
    sorted.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
  } else {
    // Default: sort by helpful desc, then createdAt desc
    sorted.sort((a, b) => {
      if (b.helpful !== a.helpful) return b.helpful - a.helpful
      return b.createdAt > a.createdAt ? 1 : -1
    })
  }

  const limit = options?.limit ?? 20
  const hasMore = sorted.length > limit

  return {
    reviews: sorted.slice(0, limit),
    nextCursor: hasMore ? sorted[limit - 1].id : null,
  }
}

// ---------------------------------------------------------------------------
// Submit review
// ---------------------------------------------------------------------------

export type SubmitReviewInput = {
  companyId: string
  authorRole: string
  title: string
  content: string
  directionScore: number
  recommendToJoin?: boolean
  employmentStatus?: string
  jobTitle?: string
  city?: string
  departmentHint?: string
  questionnaire?: Record<string, unknown>
  officeExperienceScore?: number
}

export type SubmitReviewResult =
  | { ok: true; review: Review; message: string }
  | { ok: false; error: string }

export async function submitReviewData(
  input: SubmitReviewInput
): Promise<SubmitReviewResult> {
  if (API_ENABLED) {
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      const data = await res.json()

      if (!res.ok) {
        return { ok: false, error: data.error ?? "Submission failed" }
      }

      return {
        ok: true,
        review: data.review as Review,
        message: data.message ?? "评价已提交",
      }
    } catch {
      // Fall through to mock fallback
    }
  }

  // Mock fallback: create a local review
  const now = new Date().toISOString().split("T")[0]

  const ROLE_RELATIONS: Record<string, Review["relation"]> = {
    job_seeker: "面试者",
    current_employee: "在职员工",
    former_employee: "离职员工",
    interviewee: "面试者",
    intern: "实习生",
    contractor: "外包 / 派遣",
    anonymous: "离职员工",
  }

  const mockReview: Review = {
    id: `review-local-${Date.now()}`,
    companyId: input.companyId,
    role: input.jobTitle || "匿名评价者",
    relation: ROLE_RELATIONS[input.authorRole] ?? "离职员工",
    tenure: "刚刚发布",
    score: input.directionScore,
    title: input.title,
    content: input.content,
    tags: [],
    helpful: 0,
    commentCount: 0,
    shortComment: input.title,
    jobCategory: input.jobTitle || "",
    employmentStatus: ROLE_RELATIONS[input.authorRole] ?? "离职员工",
    trustLevel: 0,
    city: input.city || "",
    comments: [],
    createdAt: now,
    verifiedHint: "本地模拟评价，待提交",
    questionnaire: input.questionnaire as Review["questionnaire"],
  }

  // Add to the mock company's reviews list
  const company = getCompany(input.companyId)
  if (company) {
    company.reviews.unshift(mockReview)
    company.reviewCount = company.reviews.length
  }

  return {
    ok: true,
    review: mockReview,
    message: "评价已本地保存（mock fallback）",
  }
}

// Re-export mock helpers for compatibility during migration
export { createLocalDiscussion }

/**
 * Reviews data access layer.
 *
 * All client-side review reads/writes go through this module so failure
 * behavior stays consistent across the app.
 *
 * Launch review flows always call the real API. A failed request must remain
 * a visible failure; silently creating a local review would mislead users
 * into believing content had been submitted for moderation.
 */
import type { Review } from "@/lib/types"

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
  const params = new URLSearchParams()
  if (options?.sort) params.set("sort", options.sort)
  if (options?.limit) params.set("limit", String(options.limit))
  if (options?.cursor) params.set("cursor", options.cursor)

  try {
    const res = await fetch(
      `/api/companies/${companyId}/reviews?${params.toString()}`,
      { credentials: "include" }
    )
    if (!res.ok) return { reviews: [], nextCursor: null }
    const data = await res.json()
    return {
      reviews: (data.reviews ?? []) as Review[],
      nextCursor: data.nextCursor ?? null,
    }
  } catch {
    return { reviews: [], nextCursor: null }
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
  departmentId?: string
  ratingDimensions: {
    pay_worth: number
    growth: number
    leader: number
    overtime_truth: number
    promise_delivery: number
  }
  questionnaire?: Record<string, unknown>
  officeExperienceScore?: number
}

export type SubmitReviewResult =
  | { ok: true; review: Review; message: string }
  | { ok: false; error: string }

export type ToggleReviewUsefulResult =
  | { ok: true; usefulCount: number; isUsefulByCurrentUser: boolean }
  | { ok: false; error: string; authenticationRequired?: boolean }

export async function toggleReviewUsefulData(
  reviewId: string,
  useful: boolean
): Promise<ToggleReviewUsefulResult> {
  try {
    const response = await fetch(`/api/reviews/${reviewId}/useful`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useful }),
    })
    const data = await response.json()
    if (!response.ok) {
      return {
        ok: false,
        error: data.error ?? "有用标记失败",
        authenticationRequired: response.status === 401,
      }
    }
    return {
      ok: true,
      usefulCount: Number(data.usefulCount),
      isUsefulByCurrentUser: Boolean(data.isUsefulByCurrentUser),
    }
  } catch {
    return { ok: false, error: "网络连接失败，请稍后重试" }
  }
}

export async function submitReviewData(
  input: SubmitReviewInput
): Promise<SubmitReviewResult> {
  try {
    const res = await fetch("/api/reviews", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })

    const data = await res.json()
    if (!res.ok) {
      return { ok: false, error: data.error ?? "评价提交失败" }
    }

    return {
      ok: true,
      review: data.review as Review,
      message: data.message ?? "评价已提交",
    }
  } catch {
    return { ok: false, error: "网络连接失败，评价尚未提交，请重试" }
  }
}

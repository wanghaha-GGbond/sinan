/**
 * Discussions data access layer.
 *
 * All discussion data reads/writes go through this module. Pages should import
 * from here instead of directly from `@/lib/mock-data`.
 *
 * When NEXT_PUBLIC_API_ENABLED is "true", functions call the real API.
 * Otherwise they fall back to the existing mock data — ensuring local
 * development and e2e tests continue to work without a database.
 */
import type { ReviewDiscussionItem } from "@/lib/types"
import {
  reviewDiscussions as mockDiscussions,
  createLocalDiscussion,
  getReviewDiscussions as mockGetDiscussions,
} from "@/lib/mock-data"
import {
  getPublicDiscussions,
  getAuthorStatusDiscussions,
  sortReviewDiscussions,
  type ReviewDiscussionSort,
} from "@/lib/review-discussion-sort"

const API_ENABLED =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_API_ENABLED === "true"

// ---------------------------------------------------------------------------
// Get review discussions
// ---------------------------------------------------------------------------

export type GetReviewDiscussionsOptions = {
  sort?: "useful" | "latest"
  limit?: number
  cursor?: string
}

export type GetReviewDiscussionsResult = {
  publicDiscussions: ReviewDiscussionItem[]
  myDiscussions: ReviewDiscussionItem[]
  nextCursor: string | null
}

export async function getReviewDiscussionsData(
  reviewId: string,
  options?: GetReviewDiscussionsOptions
): Promise<GetReviewDiscussionsResult> {
  if (API_ENABLED) {
    try {
      const params = new URLSearchParams()
      if (options?.sort) params.set("sort", options.sort)
      if (options?.limit) params.set("limit", String(options.limit))
      if (options?.cursor) params.set("cursor", options.cursor)

      const res = await fetch(
        `/api/reviews/${reviewId}/discussions?${params.toString()}`,
        { credentials: "include" }
      )
      if (!res.ok) {
        return { publicDiscussions: [], myDiscussions: [], nextCursor: null }
      }
      const data = await res.json()
      return {
        publicDiscussions: (data.publicDiscussions ?? []) as ReviewDiscussionItem[],
        myDiscussions: (data.myDiscussions ?? []) as ReviewDiscussionItem[],
        nextCursor: data.nextCursor ?? null,
      }
    } catch {
      // Fall through to mock fallback
    }
  }

  // Mock fallback: use existing mock-data + sort helpers
  const all = mockGetDiscussions(reviewId)
  const publicItems = getPublicDiscussions(all)
  const myItems = getAuthorStatusDiscussions(all)

  const sortOption = (options?.sort as ReviewDiscussionSort) ?? "useful"
  const sortedPublic = sortReviewDiscussions(publicItems, sortOption)

  const limit = options?.limit ?? 20
  const hasMore = sortedPublic.length > limit
  const sliced = sortedPublic.slice(0, limit)

  return {
    publicDiscussions: sliced,
    myDiscussions: myItems,
    nextCursor: hasMore ? sliced[sliced.length - 1].id : null,
  }
}

// ---------------------------------------------------------------------------
// Submit discussion
// ---------------------------------------------------------------------------

export type SubmitDiscussionInput = {
  companyId: string
  type: "question" | "supplement"
  content: string
  tags?: string[]
}

export type SubmitDiscussionResult =
  | { ok: true; discussion: ReviewDiscussionItem; message: string }
  | { ok: false; error: string }

export async function submitReviewDiscussionData(
  reviewId: string,
  input: SubmitDiscussionInput
): Promise<SubmitDiscussionResult> {
  if (API_ENABLED) {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/discussions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: input.companyId,
          type: input.type,
          content: input.content,
          tags: input.tags,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        return { ok: false, error: data.error ?? "Submission failed" }
      }

      return {
        ok: true,
        discussion: data.discussion as ReviewDiscussionItem,
        message: data.message ?? "内容已提交",
      }
    } catch {
      // Fall through to mock fallback
    }
  }

  // Mock fallback: create a local discussion
  const authorRoleMap: Record<string, ReviewDiscussionItem["authorRole"]> = {
    question: "job_seeker",
    supplement: "former_employee",
  }
  const authorRole = authorRoleMap[input.type] ?? "anonymous"
  const authorLabelMap: Record<string, string> = {
    question: "匿名求职者",
    supplement: "匿名过来人",
  }

  const discussion = createLocalDiscussion({
    reviewId,
    companyId: input.companyId,
    type: input.type,
    authorRole,
    authorLabel: authorLabelMap[input.type] ?? "匿名评价者",
    content: input.content,
    tags: input.tags,
  })

  return {
    ok: true,
    discussion,
    message: "内容已本地保存（mock fallback）",
  }
}

// ---------------------------------------------------------------------------
// Toggle useful
// ---------------------------------------------------------------------------

export type ToggleUsefulResult =
  | { ok: true; usefulCount: number; isUsefulByCurrentUser: boolean }
  | { ok: false; error: string }

export async function toggleReviewDiscussionUsefulData(
  discussionId: string,
  useful: boolean
): Promise<ToggleUsefulResult> {
  if (API_ENABLED) {
    try {
      const res = await fetch(
        `/api/review-discussions/${discussionId}/useful`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ useful }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        return { ok: false, error: data.error ?? "Vote failed" }
      }

      return {
        ok: true,
        usefulCount: data.usefulCount as number,
        isUsefulByCurrentUser: data.isUsefulByCurrentUser as boolean,
      }
    } catch {
      // Fall through to mock fallback
    }
  }

  // Mock fallback: local +1 / -1 on the discussion
  const item = mockDiscussions.find((d) => d.id === discussionId)
  if (!item) {
    return { ok: false, error: "Discussion not found" }
  }

  if (!["visible", "limited_visible"].includes(item.status)) {
    return { ok: false, error: "Only public discussions can be voted useful" }
  }

  if (useful) {
    if (!item.isUsefulByCurrentUser) {
      item.usefulCount += 1
      item.isUsefulByCurrentUser = true
    }
  } else {
    if (item.isUsefulByCurrentUser) {
      item.usefulCount = Math.max(0, item.usefulCount - 1)
      item.isUsefulByCurrentUser = false
    }
  }

  return {
    ok: true,
    usefulCount: item.usefulCount,
    isUsefulByCurrentUser: item.isUsefulByCurrentUser ?? false,
  }
}

// ---------------------------------------------------------------------------
// Delete discussion (author only)
// ---------------------------------------------------------------------------

export type DeleteDiscussionResult =
  | { ok: true; discussion: { id: string; status: string; deletedAt: string } }
  | { ok: false; error: string }

export async function deleteReviewDiscussionData(
  discussionId: string
): Promise<DeleteDiscussionResult> {
  if (API_ENABLED) {
    try {
      const res = await fetch(
        `/api/review-discussions/${discussionId}`,
        { method: "DELETE", credentials: "include" }
      )

      const data = await res.json()

      if (!res.ok) {
        return { ok: false, error: data.error ?? "Delete failed" }
      }

      return { ok: true, discussion: data.discussion }
    } catch {
      // Fall through to mock fallback
    }
  }

  // Mock fallback: soft-delete the discussion
  const item = mockDiscussions.find((d) => d.id === discussionId)
  if (!item) {
    return { ok: false, error: "Discussion not found" }
  }

  // Only allow author (createdByCurrentUser) to delete in mock
  if (!item.createdByCurrentUser) {
    return { ok: false, error: "Only the author can delete their discussion" }
  }

  item.status = "deleted_by_author"

  return {
    ok: true,
    discussion: {
      id: item.id,
      status: "deleted_by_author",
      deletedAt: new Date().toISOString(),
    },
  }
}

// ---------------------------------------------------------------------------
// Moderate discussion (moderator/admin only)
// ---------------------------------------------------------------------------

export type ModerateDiscussionInput = {
  status: "visible" | "limited_visible" | "hidden" | "rejected"
  reason?: string
  note?: string
  maskedContent?: string
}

export type ModerateDiscussionResult =
  | { ok: true; discussion: ReviewDiscussionItem }
  | { ok: false; error: string }

export async function moderateReviewDiscussionData(
  discussionId: string,
  input: ModerateDiscussionInput
): Promise<ModerateDiscussionResult> {
  if (API_ENABLED) {
    try {
      const res = await fetch(
        `/api/moderation/review-discussions/${discussionId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        return { ok: false, error: data.error ?? "Moderation failed" }
      }

      return { ok: true, discussion: data.discussion as ReviewDiscussionItem }
    } catch {
      // Fall through to mock fallback
    }
  }

  // Mock fallback: update the discussion status locally
  const item = mockDiscussions.find((d) => d.id === discussionId)
  if (!item) {
    return { ok: false, error: "Discussion not found" }
  }

  item.status = input.status
  if (input.maskedContent) {
    item.maskedContent = input.maskedContent
  }
  if (input.reason) {
    item.moderationReason = input.reason as ReviewDiscussionItem["moderationReason"]
  }

  // Update visibility flags
  if (input.status === "visible" || input.status === "limited_visible") {
    item.visibleToPublic = true
    item.participatesInRanking = true
  } else {
    item.visibleToPublic = false
    item.participatesInRanking = false
  }

  item.reviewedAt = new Date().toISOString()

  return { ok: true, discussion: item }
}

// Re-export helpers
export { createLocalDiscussion }

import type { ReviewDiscussionType } from "@/lib/types"

export type ReviewDiscussionDraft = {
  reviewId: string
  companyId: string
  type: ReviewDiscussionType
  content: string
  updatedAt: string
}

export function getDiscussionDraftKey(companyId: string, reviewId: string) {
  return `sinan-discussion-draft:${companyId}:${reviewId}`
}

export function readDiscussionDraft(companyId: string, reviewId: string): ReviewDiscussionDraft | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(getDiscussionDraftKey(companyId, reviewId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as ReviewDiscussionDraft
  } catch {
    return null
  }
}

export function saveDiscussionDraft(draft: ReviewDiscussionDraft) {
  if (typeof window === "undefined") return
  const content = draft.content.trim()
  const key = getDiscussionDraftKey(draft.companyId, draft.reviewId)
  if (!content) {
    window.localStorage.removeItem(key)
    return
  }
  window.localStorage.setItem(key, JSON.stringify({ ...draft, content }))
}

export function clearDiscussionDraft(companyId: string, reviewId: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(getDiscussionDraftKey(companyId, reviewId))
}

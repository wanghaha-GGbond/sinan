import type { ReviewDiscussionItem } from "@/lib/types"

export type ReviewDiscussionSort = "useful" | "latest"

const authorRoleBonus: Record<ReviewDiscussionItem["authorRole"], number> = {
  current_employee: 6,
  former_employee: 6,
  interviewee: 3,
  job_seeker: 0,
  intern: 2,
  contractor: 2,
  anonymous: 1,
}

function isLocalNow(createdAt: string) {
  return createdAt === "刚刚"
}

function getFreshnessBonus(createdAt: string) {
  if (isLocalNow(createdAt)) return 5
  const createdTime = Date.parse(createdAt)
  if (Number.isNaN(createdTime)) return 0
  const days = (Date.now() - createdTime) / (1000 * 60 * 60 * 24)
  if (days <= 7) return 5
  if (days <= 30) return 2
  return 0
}

function getTimestamp(item: ReviewDiscussionItem) {
  if (isLocalNow(item.createdAt) || item.source === "local") return Number.MAX_SAFE_INTEGER
  const value = Date.parse(item.createdAt)
  return Number.isNaN(value) ? 0 : value
}

export function isPublicDiscussion(item: ReviewDiscussionItem) {
  return item.status === "visible" || item.status === "limited_visible"
}

export function isAuthorStatusDiscussion(item: ReviewDiscussionItem) {
  return (
    Boolean(item.createdByCurrentUser) &&
    ["local_pending", "pending_review", "hidden", "rejected", "deleted_by_author"].includes(item.status)
  )
}

export function getPublicDiscussions(items: ReviewDiscussionItem[]) {
  return items.filter(isPublicDiscussion)
}

export function getAuthorStatusDiscussions(items: ReviewDiscussionItem[]) {
  return items.filter(isAuthorStatusDiscussion)
}

export function getReviewDiscussionScore(item: ReviewDiscussionItem) {
  const supplementBonus = item.type === "supplement" ? 8 : 0
  const limitedVisiblePenalty = item.status === "limited_visible" ? -5 : 0
  const nonPublicPenalty = isPublicDiscussion(item) ? 0 : -1000
  return (
    item.usefulCount * 3 +
    supplementBonus +
    authorRoleBonus[item.authorRole] +
    getFreshnessBonus(item.createdAt) +
    limitedVisiblePenalty +
    nonPublicPenalty
  )
}

export function sortReviewDiscussions(items: ReviewDiscussionItem[], sort: ReviewDiscussionSort) {
  return [...items]
    .map((item) => ({ ...item, score: getReviewDiscussionScore(item) }))
    .sort((a, b) => {
      if (sort === "useful") {
        return (b.score ?? 0) - (a.score ?? 0) || getTimestamp(b) - getTimestamp(a)
      }
      const statusRank = (item: ReviewDiscussionItem) => (isPublicDiscussion(item) ? 1 : 0)
      return (
        statusRank(b) - statusRank(a) ||
        getTimestamp(b) - getTimestamp(a) ||
        (b.createdByCurrentUser ? 1 : 0) - (a.createdByCurrentUser ? 1 : 0)
      )
    })
}

// Core domain types shared between @sinan/web and @sinan/ios

export type CompanyRiskLevel = "低" | "中" | "高"
export type CompanyReviewStatus = "pending_review" | "reviewable" | "rejected"

export type Company = {
  id: string
  name: string
  shortName: string
  industry: string
  city: string
  size: string
  stage: string
  directionScore: number
  recommendationRate: number
  reviewCount: number
  salaryRange: string
  riskLevel: CompanyRiskLevel
  riskTags: string[]
  highlights: string[]
  description?: string
  claimedStatus: "unclaimed" | "claimed"
  reviewStatus?: CompanyReviewStatus
}

export type Review = {
  id: string
  companyId: string
  authorRole: string
  authorLabel: string
  title: string
  content: string
  directionScore: number
  usefulCount: number
  discussionCount: number
  status: string
  createdAt: string
  city?: string
  employmentStatus?: string
  recommendToJoin?: boolean
}

export type ReviewDiscussionType = "question" | "supplement"
export type ReviewDiscussionStatus =
  | "draft" | "local_pending" | "pending_review"
  | "visible" | "limited_visible" | "hidden"
  | "rejected" | "deleted_by_author"

export type ReviewDiscussionItem = {
  id: string
  reviewId: string
  companyId: string
  type: ReviewDiscussionType
  authorRole: string
  authorLabel: string
  content: string
  createdAt: string
  usefulCount: number
  status: ReviewDiscussionStatus
  isUsefulByCurrentUser?: boolean
}

export type AuthUser = {
  id: string
  displayName: string
  role: string
}

// API response wrappers
export type PaginatedResponse<T> = {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

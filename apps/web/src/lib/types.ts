export type CompanyRiskLevel = "低" | "中" | "高"
export type CompanyReviewStatus = "pending_review" | "reviewable" | "rejected"

export type RatingDimension = {
  key: string
  label: string
  score: number
  description: string
}

export type Review = {
  id: string
  companyId: string
  role: string
  relation: "在职员工" | "离职员工" | "面试者" | "实习生" | "外包 / 派遣"
  tenure: string
  score: number
  title: string
  content: string
  tags: string[]
  helpful: number
  commentCount: number
  shortComment: string
  jobCategory: string
  employmentStatus: "在职员工" | "离职员工" | "面试者" | "实习生" | "外包 / 派遣"
  trustLevel: number
  city: string
  comments: Array<{ id: string; author: string; content: string }>
  createdAt: string
  verifiedHint: string
  verified?: boolean
  questionnaire?: ReviewQuestionnaire
}

export type ReviewDiscussionType = "question" | "supplement"
export type ReviewDiscussionStatus =
  | "draft"
  | "local_pending"
  | "pending_review"
  | "visible"
  | "limited_visible"
  | "hidden"
  | "rejected"
  | "deleted_by_author"
export type ReviewDiscussionModerationReason =
  | "sensitive_info"
  | "personal_attack"
  | "privacy"
  | "spam"
  | "off_topic"
  | "duplicate"
  | "author_deleted"
  | "none"

export type ReviewDiscussionVisibility = {
  visibleToAuthor: boolean
  visibleToPublic: boolean
  participatesInRanking: boolean
  statusLabel?: string
}

export type ReviewDiscussionItem = {
  id: string
  reviewId: string
  companyId: string
  type: ReviewDiscussionType
  authorRole:
    | "job_seeker"
    | "current_employee"
    | "former_employee"
    | "interviewee"
    | "intern"
    | "contractor"
    | "anonymous"
  authorLabel: string
  content: string
  maskedContent?: string
  createdAt: string
  updatedAt?: string
  usefulCount: number
  replyCount?: number
  isUsefulByCurrentUser?: boolean
  status: ReviewDiscussionStatus
  moderationReason?: ReviewDiscussionModerationReason
  tags?: string[]
  source?: "mock" | "local"
  createdByCurrentUser?: boolean
  pendingSync?: boolean
  visibleToAuthor?: boolean
  visibleToPublic?: boolean
  participatesInRanking?: boolean
  reviewedAt?: string
  score?: number
  /** Threaded replies — loaded on demand */
  replies?: ReplyItem[]
}

export type ReplyItem = {
  id: string
  discussionId: string
  authorLabel: string
  authorRole: string
  content: string
  createdAt: string
  usefulCount: number
  isUsefulByCurrentUser?: boolean
  /** Nested replies (max 2 levels deep) */
  replies?: ReplyItem[]
}

export type ReviewQuestionnaire = {
  salaryScore?: number
  growthScore?: number
  workLifeBalanceScore?: number
  managementClarityScore?: number
  collaborationScore?: number
  stabilityScore?: number
  integrityScore?: number
  interviewExperienceScore?: number
  canteenScore?: number
  officeEnvironmentScore?: number
  restroomScore?: number
  afternoonTeaScore?: number
  workstationComfortScore?: number
  commuteConvenienceScore?: number
  officeEquipmentScore?: number
  overallOfficeExperienceScore?: number
  companyPace?: "very_fast" | "fast" | "stable" | "very_stable"
  managementStyle?: "flexible" | "balanced_process" | "process_clear" | "process_heavy"
  growthExperience?: "very_fast" | "team_dependent" | "average" | "limited"
  collaborationStyle?: "cross_team" | "within_team" | "individual" | "high_friction"
  overtimeLevel?: "very_high" | "high" | "normal" | "low"
  promiseKeeping?: "mostly_kept" | "partially_kept" | "often_changed" | "unknown"
}

export type CBTIAxis = {
  pace: "R" | "S"
  management: "F" | "P"
  growth: "G" | "B"
  collaboration: "C" | "I"
}

export type CBTIProfile = {
  code: string
  title: string
  summary: string
  axes: CBTIAxis
  confidence: number
  generatedBy: "mock" | "ai"
  updatedAt: string
}

export type CompanyVibeTag = {
  id: string
  name: string
  shortName: string
  summary: string
  signals: string[]
  riskLevel: "low" | "medium" | "high"
  tone: "positive" | "neutral" | "caution"
  confidence: number
  generatedBy: "mock" | "ai"
  updatedAt: string
}

export type RatingInsight = {
  label: string
  count: number
  summary: string
}

export type CompassBrief = {
  id: string
  text: string
  score: number
  helpful: number
  source: Review["relation"]
}

export type Company = {
  id: string
  claimedStatus: "unclaimed" | "claimed"
  name: string
  registeredName?: string
  shortName: string
  alias?: string[]
  englishName?: string
  unifiedSocialCreditCode?: string
  registeredAddress?: string
  legalRepresentative?: string
  businessStatus?: string
  foundedDate?: string
  industry: string
  city: string
  size: string
  stage: string
  financingStage?: string
  website?: string
  description?: string
  directionScore: number
  recommendationRate: number
  reviewCount: number
  salaryRange: string
  riskLevel: CompanyRiskLevel
  riskTags: string[]
  trustLevel: string
  highlights: string[]
  compassBriefs: CompassBrief[]
  lowScoreReasons: RatingInsight[]
  recommendationReasons: RatingInsight[]
  dimensions: RatingDimension[]
  scoreDistribution: { score: string; count: number }[]
  trend: { month: string; score: number; reviews: number }[]
  reviews: Review[]
  cbti?: CBTIProfile
  vibeTag?: CompanyVibeTag
  scoreCanteen?: number
  scoreOfficeEnvironment?: number
  scoreRestroom?: number
  scoreAfternoonTea?: number
  scoreWorkstationComfort?: number
  scoreCommuteConvenience?: number
  scoreOfficeEquipment?: number
  scoreOfficeExperience?: number
  source?: "mock" | "user_added" | "platform_verified"
  createdByUser?: boolean
  pendingReview?: boolean
  reviewStatus?: CompanyReviewStatus
}

export type RatingDraft = {
  companyId: string
  directionScore: number
  dimensions: Record<string, number>
  relation: Review["relation"]
  role: string
  title: string
  content: string
  tags: string[]
  interviewDifficulty?: number
  salaryRange?: string
}

export type DailyTask = {
  id: string
  title: string
  rewardPoints: number
  progress: number
  target: number
  completed: boolean
  /** Where the "去完成" button should take the user. */
  href?: string
  /** Optional tooltip when the task is locked / requires a company. */
  hint?: string
}

export type MyReviewEntry = Review & {
  companyId: string
  companyName: string
}

export type BadgeProgress = {
  id: string
  name: string
  description: string
  unlocked: boolean
  progress?: number
  target?: number
}

export type CurrentUser = {
  username: string
  trustLevel: number
  directionPoints: number
  nextLevelPoints: number
  streakDays: number
  helpedCount: number
  badges: string[]
}

export type RecommendedCompanyItem = {
  id: string
  companyId: string
  companyName: string
  industry: string
  city: string
  size: string
  stage: string
  directionScore: number
  reviewCount: number
  recommendationRate: number
  recommendReason: string
  matchedPreferences: string[]
  highlightedMetrics: {
    label: string
    score: number
  }[]
  cbtiCode?: string
  cbtiTitle?: string
  vibeTagName?: string
  vibeTagSummary?: string
  officeExperienceScore?: number
  recentReviewCount: number
  recentViewCount: number
}

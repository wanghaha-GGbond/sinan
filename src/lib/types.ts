export type CompanyRiskLevel = "低" | "中" | "高"

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
  questionnaire?: ReviewQuestionnaire
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
  scoreCanteen?: number
  scoreOfficeEnvironment?: number
  scoreRestroom?: number
  scoreAfternoonTea?: number
  scoreWorkstationComfort?: number
  scoreCommuteConvenience?: number
  scoreOfficeEquipment?: number
  scoreOfficeExperience?: number
  source?: "mock" | "user_added"
  createdByUser?: boolean
  pendingReview?: boolean
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
  officeExperienceScore?: number
  recentReviewCount: number
  recentViewCount: number
}

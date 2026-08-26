// Runtime-checked response contracts shared by Web and iOS.
//
// These guards intentionally validate the fields consumed by both clients.
// A server response that changes shape must fail as an API error instead of
// silently rendering partial or fabricated content in the native app.

export type ApiUser = {
  id: string
  displayName: string | null
  role: string
  trustLevel?: number
}

export type AuthApiResponse = {
  user: ApiUser | null
  token?: string
}

export type CompanyApiItem = {
  id: string
  name: string
  registeredName: string | null
  shortName: string | null
  englishName: string | null
  aliases: string[] | null
  city: string
  industry: string
  size: string | null
  financingStage: string | null
  website: string | null
  logoUrl: string | null
  description: string | null
  reviewStatus: "pending_review" | "reviewable" | "rejected"
  claimedStatus: "unclaimed" | "claimed"
  verifiedIdentityCount: number
  source: "platform_seed" | "user_added" | "platform_verified" | "import"
  businessStatus: string | null
  foundedDate: string | null
  unifiedSocialCreditCode: string | null
  registeredAddress: string | null
  legalRepresentative: string | null
  createdAt: string
  updatedAt: string
  directionScore?: number
  recommendationRate?: number
  reviewCount?: number
  salaryRange?: string | null
  riskLevel?: string
  riskTags?: string[]
  highlights?: string[]
}

export type ReviewApiItem = {
  id: string
  companyId: string
  departmentId?: string | null
  authorRole: string
  authorLabel: string
  title: string
  content: string | null
  summary?: string | null
  directionScore: string
  recommendToJoin?: boolean | null
  employmentStatus?: string | null
  jobTitle?: string | null
  city?: string | null
  questionnaire?: Record<string, unknown> | null
  ratingDimensions?: Record<string, unknown> | null
  officeExperienceScore?: string | null
  usefulCount: number
  isUsefulByCurrentUser?: boolean
  discussionCount: number
  tags: string[] | null
  publicAuthor: {
    label: string
    role: string
    verificationLevel: "none" | "L1" | "L2"
    verifiedForCompany: boolean
  }
  status: string
  createdAt: string
  updatedAt?: string
  reviewedAt?: string | null
}

export type ResearchListItem = {
  slug: string
  name: string
  city: string
  industry: string
  overallScore: number | null
  confidence: number
  funTag: string
  oneLine: string
}

export type ResearchSummary = {
  companies: number
  observations: number
  usableObservations: number
  externalEvidence: number
}

export type ResearchListApiResponse = {
  generatedAt: string
  summary: ResearchSummary
  companies: ResearchListItem[]
}

export type ResearchScoreDetail = {
  score: number
  confidence: number
  evidenceCount: number
  reasons?: string[]
  limitations: string[]
}

export type ResearchReport = {
  card: {
    name: string
    city: string
    industry: string
    recommendationTier: string
    oneLine: string
    departments: string[]
    candidateAdvice: string
    opportunityDetails: Array<{ signal: string; basis: string; sourceUrl: string }>
    riskDetails: Array<{ signal: string; basis: string; sourceUrl: string }>
  }
  index: {
    overallScore: number | null
    confidence: number
    funTag: string
    components: Record<string, ResearchScoreDetail>
    funIndices: Record<string, ResearchScoreDetail>
  }
  labels: { components: Record<string, string>; funIndices: Record<string, string> }
}

export type CompanySearchApiResponse = { companies: CompanyApiItem[] }
export type CompanyDetailApiResponse = { company: CompanyApiItem }
export type ReviewListApiResponse = { reviews: ReviewApiItem[] }
export type ReviewDetailApiResponse = { review: ReviewApiItem }
export type ReviewUsefulApiResponse = {
  usefulCount: number
  isUsefulByCurrentUser: boolean
}
export type ReviewMutationApiResponse = { review: ReviewApiItem; message: string }
export type DeleteAccountApiResponse = { success: true }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value)
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean"
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString)
}

function hasString(record: Record<string, unknown>, key: string) {
  return isString(record[key])
}

function hasNullableString(record: Record<string, unknown>, key: string) {
  return isNullableString(record[key])
}

function isApiUser(value: unknown): value is ApiUser {
  if (!isRecord(value)) return false
  return (
    hasString(value, "id") &&
    hasNullableString(value, "displayName") &&
    hasString(value, "role") &&
    (value.trustLevel === undefined || isNumber(value.trustLevel))
  )
}

export function isAuthApiResponse(value: unknown): value is AuthApiResponse {
  if (!isRecord(value) || !(value.user === null || isApiUser(value.user))) return false
  return value.token === undefined || isString(value.token)
}

export function isCompanyApiItem(value: unknown): value is CompanyApiItem {
  if (!isRecord(value)) return false

  const validStatus = ["pending_review", "reviewable", "rejected"].includes(String(value.reviewStatus))
  const validClaim = ["unclaimed", "claimed"].includes(String(value.claimedStatus))
  const validSource = ["platform_seed", "user_added", "platform_verified", "import"].includes(String(value.source))

  return (
    hasString(value, "id") &&
    hasString(value, "name") &&
    hasNullableString(value, "registeredName") &&
    hasNullableString(value, "shortName") &&
    hasNullableString(value, "englishName") &&
    (value.aliases === null || isStringArray(value.aliases)) &&
    hasString(value, "city") &&
    hasString(value, "industry") &&
    hasNullableString(value, "size") &&
    hasNullableString(value, "financingStage") &&
    hasNullableString(value, "website") &&
    hasNullableString(value, "logoUrl") &&
    hasNullableString(value, "description") &&
    validStatus &&
    validClaim &&
    isNumber(value.verifiedIdentityCount) &&
    validSource &&
    hasNullableString(value, "businessStatus") &&
    hasNullableString(value, "foundedDate") &&
    hasNullableString(value, "unifiedSocialCreditCode") &&
    hasNullableString(value, "registeredAddress") &&
    hasNullableString(value, "legalRepresentative") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt") &&
    (value.directionScore === undefined || isNumber(value.directionScore)) &&
    (value.recommendationRate === undefined || isNumber(value.recommendationRate)) &&
    (value.reviewCount === undefined || isNumber(value.reviewCount)) &&
    (value.salaryRange === undefined || hasNullableString(value, "salaryRange")) &&
    (value.riskLevel === undefined || isString(value.riskLevel)) &&
    (value.riskTags === undefined || isStringArray(value.riskTags)) &&
    (value.highlights === undefined || isStringArray(value.highlights))
  )
}

export function isCompanySearchApiResponse(value: unknown): value is CompanySearchApiResponse {
  return isRecord(value) && Array.isArray(value.companies) && value.companies.every(isCompanyApiItem)
}

export function isCompanyDetailApiResponse(value: unknown): value is CompanyDetailApiResponse {
  return isRecord(value) && isCompanyApiItem(value.company)
}

function isPublicAuthor(value: unknown): value is ReviewApiItem["publicAuthor"] {
  if (!isRecord(value)) return false
  return (
    hasString(value, "label") &&
    hasString(value, "role") &&
    ["none", "L1", "L2"].includes(String(value.verificationLevel)) &&
    isBoolean(value.verifiedForCompany)
  )
}

export function isReviewApiItem(value: unknown): value is ReviewApiItem {
  if (!isRecord(value)) return false
  return (
    hasString(value, "id") &&
    hasString(value, "companyId") &&
    hasString(value, "authorRole") &&
    hasString(value, "authorLabel") &&
    hasString(value, "title") &&
    hasNullableString(value, "content") &&
    (value.summary === undefined || hasNullableString(value, "summary")) &&
    hasString(value, "directionScore") &&
    (value.recommendToJoin === undefined || value.recommendToJoin === null || isBoolean(value.recommendToJoin)) &&
    (value.employmentStatus === undefined || hasNullableString(value, "employmentStatus")) &&
    (value.jobTitle === undefined || hasNullableString(value, "jobTitle")) &&
    (value.city === undefined || hasNullableString(value, "city")) &&
    (value.questionnaire === undefined || value.questionnaire === null || isRecord(value.questionnaire)) &&
    (value.ratingDimensions === undefined || value.ratingDimensions === null || isRecord(value.ratingDimensions)) &&
    (value.officeExperienceScore === undefined || hasNullableString(value, "officeExperienceScore")) &&
    isNumber(value.usefulCount) &&
    (value.isUsefulByCurrentUser === undefined || isBoolean(value.isUsefulByCurrentUser)) &&
    isNumber(value.discussionCount) &&
    (value.tags === null || isStringArray(value.tags)) &&
    isPublicAuthor(value.publicAuthor) &&
    hasString(value, "status") &&
    hasString(value, "createdAt") &&
    (value.updatedAt === undefined || hasString(value, "updatedAt")) &&
    (value.reviewedAt === undefined || hasNullableString(value, "reviewedAt"))
  )
}

export function isReviewListApiResponse(value: unknown): value is ReviewListApiResponse {
  return isRecord(value) && Array.isArray(value.reviews) && value.reviews.every(isReviewApiItem)
}

export function isReviewDetailApiResponse(value: unknown): value is ReviewDetailApiResponse {
  return isRecord(value) && isReviewApiItem(value.review)
}

export function isReviewUsefulApiResponse(value: unknown): value is ReviewUsefulApiResponse {
  return isRecord(value) && isNumber(value.usefulCount) && isBoolean(value.isUsefulByCurrentUser)
}

export function isReviewMutationApiResponse(value: unknown): value is ReviewMutationApiResponse {
  return isRecord(value) && isReviewApiItem(value.review) && hasString(value, "message")
}

function isResearchListItem(value: unknown): value is ResearchListItem {
  if (!isRecord(value)) return false
  return (
    hasString(value, "slug") &&
    hasString(value, "name") &&
    hasString(value, "city") &&
    hasString(value, "industry") &&
    (value.overallScore === null || isNumber(value.overallScore)) &&
    isNumber(value.confidence) &&
    hasString(value, "funTag") &&
    hasString(value, "oneLine")
  )
}

export function isResearchListApiResponse(value: unknown): value is ResearchListApiResponse {
  if (!isRecord(value) || !hasString(value, "generatedAt") || !isRecord(value.summary)) return false
  const summary = value.summary
  return (
    isNumber(summary.companies) &&
    isNumber(summary.observations) &&
    isNumber(summary.usableObservations) &&
    isNumber(summary.externalEvidence) &&
    Array.isArray(value.companies) &&
    value.companies.every(isResearchListItem)
  )
}

function isResearchScoreDetail(value: unknown): value is ResearchScoreDetail {
  if (!isRecord(value) || !isNumber(value.score) || !isNumber(value.confidence) || !isNumber(value.evidenceCount)) return false
  return (
    (value.reasons === undefined || isStringArray(value.reasons)) &&
    isStringArray(value.limitations)
  )
}

function isResearchDetailCard(value: unknown): value is ResearchReport["card"] {
  if (!isRecord(value)) return false
  const isEvidenceList = (items: unknown): boolean =>
    Array.isArray(items) &&
    items.every((item) => isRecord(item) && hasString(item, "signal") && hasString(item, "basis") && hasString(item, "sourceUrl"))
  return (
    hasString(value, "name") &&
    hasString(value, "city") &&
    hasString(value, "industry") &&
    hasString(value, "recommendationTier") &&
    hasString(value, "oneLine") &&
    isStringArray(value.departments) &&
    hasString(value, "candidateAdvice") &&
    isEvidenceList(value.opportunityDetails) &&
    isEvidenceList(value.riskDetails)
  )
}

export function isResearchDetailApiResponse(value: unknown): value is ResearchReport {
  if (!isRecord(value) || !isResearchDetailCard(value.card) || !isRecord(value.index) || !isRecord(value.labels)) return false
  const index = value.index
  const labels = value.labels
  const isScoreMap = (items: unknown): boolean =>
    isRecord(items) && Object.values(items).every(isResearchScoreDetail)
  const isLabelMap = (items: unknown): boolean =>
    isRecord(items) && Object.values(items).every(isString)
  return (
    (index.overallScore === null || isNumber(index.overallScore)) &&
    isNumber(index.confidence) &&
    isScoreMap(index.components) &&
    isScoreMap(index.funIndices) &&
    isLabelMap(labels.components) &&
    isLabelMap(labels.funIndices)
  )
}

export function isDeleteAccountApiResponse(value: unknown): value is DeleteAccountApiResponse {
  return isRecord(value) && value.success === true
}

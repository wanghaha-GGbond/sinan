import { expect, test } from "@playwright/test"

import {
  isAuthApiResponse,
  isCompanyDetailApiResponse,
  isCompanySearchApiResponse,
  isDeleteAccountApiResponse,
  isResearchDetailApiResponse,
  isResearchListApiResponse,
  isReviewDetailApiResponse,
  isReviewListApiResponse,
  isReviewMutationApiResponse,
  isReviewUsefulApiResponse,
} from "../../../packages/shared/src/api-contracts"

const company = {
  id: "company-1",
  name: "司南科技",
  registeredName: "司南科技有限公司",
  shortName: "司南",
  englishName: null,
  aliases: ["Sinan"],
  city: "杭州",
  industry: "软件服务",
  size: "100-300 人",
  financingStage: "A 轮",
  website: null,
  logoUrl: null,
  description: "公开公司简介",
  reviewStatus: "reviewable",
  claimedStatus: "unclaimed",
  verifiedIdentityCount: 0,
  source: "platform_seed",
  businessStatus: "存续",
  foundedDate: null,
  unifiedSocialCreditCode: null,
  registeredAddress: null,
  legalRepresentative: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  directionScore: 7.5,
  recommendationRate: 80,
  reviewCount: 2,
  riskTags: ["需核实"],
} as const

const review = {
  id: "review-1",
  companyId: company.id,
  departmentId: null,
  authorRole: "former_employee",
  authorLabel: "匿名过来人",
  title: "一段真实体验",
  content: "公开内容",
  summary: "一句话总结",
  directionScore: "7.5",
  recommendToJoin: true,
  employmentStatus: "离职员工",
  jobTitle: "工程师",
  city: "杭州",
  questionnaire: {},
  ratingDimensions: null,
  officeExperienceScore: null,
  usefulCount: 3,
  isUsefulByCurrentUser: false,
  discussionCount: 1,
  tags: ["流程清晰"],
  publicAuthor: {
    label: "匿名过来人",
    role: "former_employee",
    verificationLevel: "L1",
    verifiedForCompany: true,
  },
  status: "visible",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  reviewedAt: null,
} as const

const researchList = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  summary: { companies: 1, observations: 2, usableObservations: 2, externalEvidence: 1 },
  companies: [{
    slug: "sinan",
    name: "司南科技",
    city: "杭州",
    industry: "软件服务",
    overallScore: 72,
    confidence: 60,
    funTag: "稳中有进",
    oneLine: "证据仍需持续补充。",
  }],
} as const

const researchDetail = {
  card: {
    name: "司南科技",
    city: "杭州",
    industry: "软件服务",
    recommendationTier: "谨慎考虑",
    oneLine: "证据仍需持续补充。",
    departments: ["研发"],
    candidateAdvice: "在面试中核实岗位边界。",
    opportunityDetails: [{ signal: "成长", basis: "公开资料", sourceUrl: "https://example.com/opportunity" }],
    riskDetails: [{ signal: "样本有限", basis: "当前样本较少", sourceUrl: "https://example.com/risk" }],
  },
  index: {
    overallScore: 72,
    confidence: 60,
    funTag: "稳中有进",
    components: { growth: { score: 72, confidence: 60, evidenceCount: 2, reasons: [], limitations: [] } },
    funIndices: { weekend: { score: 55, confidence: 40, evidenceCount: 1, reasons: [], limitations: ["样本有限"] } },
  },
  labels: { components: { growth: "成长动能" }, funIndices: { weekend: "双休可信" } },
} as const

test("Web and iOS accept the same core API response contracts", () => {
  expect(isAuthApiResponse({ user: { id: "user-1", displayName: "匿名用户", role: "user" }, token: "jwt" })).toBe(true)
  expect(isCompanySearchApiResponse({ companies: [company] })).toBe(true)
  expect(isCompanyDetailApiResponse({ company })).toBe(true)
  expect(isReviewListApiResponse({ reviews: [review] })).toBe(true)
  expect(isReviewDetailApiResponse({ review })).toBe(true)
  expect(isReviewUsefulApiResponse({ usefulCount: 4, isUsefulByCurrentUser: true })).toBe(true)
  expect(isReviewMutationApiResponse({ review, message: "评价已提交" })).toBe(true)
  expect(isDeleteAccountApiResponse({ success: true })).toBe(true)
  expect(isResearchListApiResponse(researchList)).toBe(true)
  expect(
    isResearchListApiResponse({
      ...researchList,
      companies: [{ ...researchList.companies[0], overallScore: null }],
    }),
  ).toBe(true)
  expect(isResearchDetailApiResponse(researchDetail)).toBe(true)
})

test("contract guards reject partial or incompatible responses", () => {
  const missingCompanyName: Record<string, unknown> = { ...company }
  delete missingCompanyName.name
  const malformedReview: Record<string, unknown> = { ...review, usefulCount: "3" }
  const malformedResearch: Record<string, unknown> = { ...researchList, companies: [{ ...researchList.companies[0], confidence: "60" }] }

  expect(isCompanySearchApiResponse({ companies: [missingCompanyName] })).toBe(false)
  expect(isReviewListApiResponse({ reviews: [malformedReview] })).toBe(false)
  expect(isResearchListApiResponse(malformedResearch)).toBe(false)
  expect(isDeleteAccountApiResponse({ success: "true" })).toBe(false)
})

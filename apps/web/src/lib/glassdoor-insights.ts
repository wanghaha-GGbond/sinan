import type { Company, Review, ReviewDiscussionItem } from "@/lib/types"

export type SalaryInsight = {
  companyId: string
  companyName: string
  role: string
  range: string
  medianLabel: string
  payScore: number
  sampleCount: number
  signal: string
}

export type InterviewInsight = {
  companyId: string
  companyName: string
  role: string
  rounds: string
  experienceScore: number
  sampleCount: number
  signal: string
}

export type OpportunityInsight = {
  companyId: string
  companyName: string
  role: string
  city: string
  fitScore: number
  signal: string
  tags: string[]
}

export type BenefitInsight = {
  companyId: string
  companyName: string
  officeScore: number
  commuteScore: number
  canteenScore: number
  signal: string
  tags: string[]
}

export type CommunityInsight = {
  companyId: string
  companyName: string
  discussionId: string
  type: ReviewDiscussionItem["type"]
  authorLabel: string
  content: string
  usefulCount: number
  tags: string[]
}

function payScore(company: Company) {
  return company.dimensions.find((item) => item.key === "pay")?.score ?? company.directionScore
}

function medianFromRange(range: string) {
  const match = range.match(/(\d+)k-(\d+)k/i)
  if (!match) return range
  const median = Math.round((Number(match[1]) + Number(match[2])) / 2)
  const multiplier = range.match(/x\s*(\d+)/i)?.[1]
  return multiplier ? `${median}k x ${multiplier}` : `${median}k`
}

function mostCommonRole(reviews: Review[], fallback = "综合岗位") {
  const counter = new Map<string, number>()
  reviews.forEach((review) => counter.set(review.jobCategory, (counter.get(review.jobCategory) ?? 0) + 1))
  return Array.from(counter.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || fallback
}

export function getSalaryInsights(companies: Company[]): SalaryInsight[] {
  return companies
    .flatMap((company) => {
      const roles = Array.from(new Set(company.reviews.map((review) => review.jobCategory))).slice(0, 3)
      const selectedRoles = roles.length ? roles : [mostCommonRole(company.reviews)]
      return selectedRoles.map((role) => ({
        companyId: company.id,
        companyName: company.shortName,
        role,
        range: company.salaryRange ?? "面议",
        medianLabel: medianFromRange(company.salaryRange ?? ""),
        payScore: payScore(company),
        sampleCount: Math.max(12, Math.round(company.reviewCount / 18)),
        signal:
          company.recommendationReasons.find((item) => item.label.includes("薪资"))?.summary ||
          company.highlights.find((item) => item.includes("薪资")) ||
          "来自匿名评价中的薪资兑现、奖金和调薪信号。",
      }))
    })
    .sort((a, b) => b.payScore - a.payScore)
}

export function getInterviewInsights(companies: Company[]): InterviewInsight[] {
  return companies
    .map((company) => {
      const interviewReviews = company.reviews.filter((review) => review.relation === "面试者")
      const review = interviewReviews[0] ?? company.reviews.find((item) => /面试/.test(item.content + item.title))
      return {
        companyId: company.id,
        companyName: company.shortName,
        role: review?.jobCategory || mostCommonRole(company.reviews),
        rounds: review?.tenure || (company.riskTags.some((tag) => tag.includes("面试")) ? "面试轮次较多" : "流程待补充"),
        experienceScore: review?.questionnaire?.interviewExperienceScore ?? review?.score ?? company.directionScore,
        sampleCount: Math.max(4, interviewReviews.length + Math.round(company.reviewCount / 80)),
        signal: review?.shortComment || review?.title || "匿名样本正在补充面试流程、等待时间和题目相关性。",
      }
    })
    .sort((a, b) => b.experienceScore - a.experienceScore)
}

export function getOpportunityInsights(companies: Company[]): OpportunityInsight[] {
  return companies
    .flatMap((company) => {
      const roles = Array.from(new Set(company.reviews.map((review) => review.jobCategory))).slice(0, 4)
      return roles.map((role, index) => ({
        companyId: company.id,
        companyName: company.shortName,
        role,
        city: company.city,
        fitScore: Number(Math.max(5.2, company.directionScore - index * 0.22).toFixed(1)),
        signal: company.compassBriefs[index % company.compassBriefs.length]?.text || company.description || "根据匿名评价生成的岗位适配提醒。",
        tags: [company.industry, company.stage, ...company.riskTags.slice(0, 1)],
      }))
    })
    .sort((a, b) => b.fitScore - a.fitScore)
}

export function getBenefitInsights(companies: Company[]): BenefitInsight[] {
  return companies
    .map((company) => ({
      companyId: company.id,
      companyName: company.shortName,
      officeScore: company.scoreOfficeExperience ?? company.directionScore,
      commuteScore: company.scoreCommuteConvenience ?? company.directionScore,
      canteenScore: company.scoreCanteen ?? company.directionScore,
      signal:
        company.vibeTag?.summary ||
        company.highlights.find((item) => /福利|环境|边界|稳定/.test(item)) ||
        "根据办公环境、通勤、食堂和设备等匿名样本生成。",
      tags: [
        `办公 ${((company.scoreOfficeExperience ?? company.directionScore)).toFixed(1)}`,
        `通勤 ${((company.scoreCommuteConvenience ?? company.directionScore)).toFixed(1)}`,
        `食堂 ${((company.scoreCanteen ?? company.directionScore)).toFixed(1)}`,
      ],
    }))
    .sort((a, b) => b.officeScore - a.officeScore)
}

export function getCommunityInsights(companies: Company[], discussions: ReviewDiscussionItem[]): CommunityInsight[] {
  const companyNames = new Map(companies.map((company) => [company.id, company.shortName]))
  return discussions
    .filter((item) => item.status === "visible" || item.status === "limited_visible")
    .sort((a, b) => b.usefulCount - a.usefulCount)
    .slice(0, 16)
    .map((item) => ({
      companyId: item.companyId,
      companyName: companyNames.get(item.companyId) ?? item.companyId,
      discussionId: item.id,
      type: item.type,
      authorLabel: item.authorLabel,
      content: item.maskedContent || item.content,
      usefulCount: item.usefulCount,
      tags: item.tags ?? [],
    }))
}

export function getCompanySnapshot(company: Company) {
  const interviewReviews = company.reviews.filter((review) => review.relation === "面试者")
  const salaryReviews = company.reviews.filter((review) => /薪资|调薪|奖金|兑现/.test(review.content + review.shortComment))
  const openRoles = Array.from(new Set(company.reviews.map((review) => review.jobCategory))).slice(0, 4)

  return {
    salaryMedian: medianFromRange(company.salaryRange ?? ""),
    salarySamples: Math.max(12, Math.round(company.reviewCount / 18)),
    interviewCount: Math.max(4, interviewReviews.length + Math.round(company.reviewCount / 80)),
    salarySignalCount: salaryReviews.length,
    communityCount: company.reviews.reduce((sum, review) => sum + review.commentCount, 0),
    openRoles,
    topRole: mostCommonRole(company.reviews),
    payScore: payScore(company),
    interviewScore:
      interviewReviews[0]?.questionnaire?.interviewExperienceScore ?? interviewReviews[0]?.score ?? company.directionScore,
  }
}

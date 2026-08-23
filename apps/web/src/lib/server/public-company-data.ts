import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"

import { companies } from "@/db/schema/companies"
import { reviews } from "@/db/schema/reviews"
import type { Company, CompanyListItem, Review, ReviewListItem } from "@/lib/types"
import { companies as mockCompanies } from "@/lib/mock-data"
import { toPublicCompanyView } from "@/lib/server/company-view"
import { toPublicReviewView } from "@/lib/server/review-view"
import { inferPublicCBTI } from "@/lib/server/company-cbti"
import { extractPublicDimensionScores } from "@/lib/review-questionnaire"
import { getAuthUser } from "@/lib/server/auth"
import {
  findPublicReview,
  getBlockedReviewAuthorKeys,
  getPublicReviewMetadata,
  isReviewAuthorBlocked,
} from "@/lib/server/public-review-query"

export function mockCompanyToPublicView(company: Company): CompanyListItem {
  return {
    id: company.id,
    name: company.name,
    registeredName: company.registeredName ?? null,
    shortName: company.shortName,
    englishName: company.englishName ?? null,
    aliases: company.alias ?? null,
    city: company.city,
    industry: company.industry,
    size: company.size,
    financingStage: company.financingStage ?? company.stage ?? null,
    website: company.website ?? null,
    logoUrl: company.logoUrl ?? null,
    description: company.description ?? null,
    reviewStatus: company.reviewStatus === "pending_review" ? "pending_review" : "reviewable",
    claimedStatus: company.claimedStatus,
    verifiedIdentityCount: company.verifiedIdentityCount ?? 0,
    source: company.source === "platform_verified" ? "platform_verified" : company.source === "user_added" ? "user_added" : "platform_seed",
    businessStatus: company.businessStatus ?? null,
    foundedDate: company.foundedDate ?? null,
    unifiedSocialCreditCode: company.unifiedSocialCreditCode ?? null,
    registeredAddress: company.registeredAddress ?? null,
    legalRepresentative: company.legalRepresentative ?? null,
    createdAt: company.createdAt ?? "2026-01-01",
    updatedAt: company.updatedAt ?? company.createdAt ?? "2026-01-01",
    directionScore: company.directionScore,
    recommendationRate: company.recommendationRate,
    reviewCount: company.reviewCount,
    salaryRange: company.salaryRange,
    riskLevel: company.riskLevel,
    riskTags: company.riskTags,
    highlights: company.highlights,
    scoreDistribution: company.scoreDistribution,
    cbti: company.cbti,
    vibeTag: company.vibeTag,
  }
}

export function mockReviewToListItem(review: Review): ReviewListItem {
  const verificationLevel: "none" | "L1" | "L2" = review.trustLevel >= 2 ? "L2" : review.trustLevel >= 1 ? "L1" : "none"
  return {
    id: review.id,
    companyId: review.companyId,
    title: review.title,
    content: review.content,
    summary: review.shortComment,
    directionScore: String(review.score),
    recommendToJoin: review.score >= 7,
    employmentStatus: review.employmentStatus,
    jobTitle: review.jobCategory || review.role,
    city: review.city,
    authorRole: review.relation,
    authorLabel: review.role,
    usefulCount: review.helpful,
    isUsefulByCurrentUser: review.isUsefulByCurrentUser,
    discussionCount: review.commentCount,
    dimensionScores: review.questionnaire,
    publicAuthor: {
      label: "匿名过来人",
      role: review.relation,
      verificationLevel,
      verifiedForCompany: Boolean(review.verified),
    },
    status: "visible",
    createdAt: review.createdAt,
    tags: review.tags,
  }
}

export function getMockCompany(companyId: string) {
  return mockCompanies.find((company) => company.id === companyId) ?? null
}

function toReviewListItem(
  row: typeof reviews.$inferSelect,
  view: ReturnType<typeof toPublicReviewView>
): ReviewListItem {
  const tags = view.tags

  const dimensionScores = (() => {
    if (!row.questionnaire || typeof row.questionnaire !== "object" || Array.isArray(row.questionnaire)) return undefined
    return extractPublicDimensionScores(row.questionnaire) as ReviewListItem["dimensionScores"] | undefined
  })()

  return {
    id: view.id,
    companyId: view.companyId,
    title: view.title,
    content: view.content,
    summary: view.summary,
    directionScore: view.directionScore,
    recommendToJoin: view.recommendToJoin,
    employmentStatus: view.employmentStatus,
    jobTitle: view.jobTitle,
    city: view.city,
    authorRole: view.authorRole,
    authorLabel: view.authorLabel,
    usefulCount: view.usefulCount,
    isUsefulByCurrentUser: view.isUsefulByCurrentUser,
    discussionCount: view.discussionCount,
    dimensionScores,
    publicAuthor: view.publicAuthor,
    status: view.status,
    createdAt: view.createdAt,
    tags,
  }
}

export async function getPublicCompanyDetail(
  companyId: string,
): Promise<CompanyListItem | null> {
  if (!process.env.DATABASE_URL) {
    const company = getMockCompany(companyId)
    return company ? mockCompanyToPublicView(company) : null
  }

  const { db } = await import("@/db/client")

  const [companyRow] = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.id, companyId),
        eq(companies.reviewStatus, "reviewable"),
        isNull(companies.deletedAt),
      ),
    )
    .limit(1)

  if (!companyRow) return null

  const [aggregate] = await db
    .select({
      avgDirection: sql<number>`round(avg(${reviews.directionScore})::numeric, 1)`,
      recommendCount: sql<number>`count(*) filter (where ${reviews.recommendToJoin} = true)`,
      totalCount: sql<number>`count(*)`,
      score0to2: sql<number>`count(*) filter (where ${reviews.directionScore} < 2)`,
      score2to4: sql<number>`count(*) filter (where ${reviews.directionScore} >= 2 and ${reviews.directionScore} < 4)`,
      score4to6: sql<number>`count(*) filter (where ${reviews.directionScore} >= 4 and ${reviews.directionScore} < 6)`,
      score6to8: sql<number>`count(*) filter (where ${reviews.directionScore} >= 6 and ${reviews.directionScore} < 8)`,
      score8to10: sql<number>`count(*) filter (where ${reviews.directionScore} >= 8)`,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.companyId, companyId),
        inArray(reviews.status, ["visible", "limited_visible"]),
        isNull(reviews.deletedAt),
      ),
    )

  const reviewCount = Number(aggregate?.totalCount ?? 0)
  const signalRows = await db
    .select({ directionScore: reviews.directionScore, questionnaire: reviews.questionnaire })
    .from(reviews)
    .where(
      and(
        eq(reviews.companyId, companyId),
        inArray(reviews.status, ["visible", "limited_visible"]),
        isNull(reviews.deletedAt),
      ),
    )

  return {
    ...toPublicCompanyView(companyRow),
    directionScore: reviewCount > 0 ? Number(aggregate?.avgDirection ?? 0) : 0,
    recommendationRate:
      reviewCount > 0
        ? Math.round((Number(aggregate?.recommendCount ?? 0) / reviewCount) * 100)
        : 0,
    reviewCount,
    salaryRange: null,
    riskLevel: "低",
    riskTags: [],
    highlights: [],
    scoreDistribution: [
      { score: "0-2", count: Number(aggregate?.score0to2 ?? 0) },
      { score: "2-4", count: Number(aggregate?.score2to4 ?? 0) },
      { score: "4-6", count: Number(aggregate?.score4to6 ?? 0) },
      { score: "6-8", count: Number(aggregate?.score6to8 ?? 0) },
      { score: "8-10", count: Number(aggregate?.score8to10 ?? 0) },
    ],
    cbti: inferPublicCBTI(signalRows),
  }
}

export async function getPublicCompanyReviews(
  companyId: string,
  limit = 50,
): Promise<ReviewListItem[]> {
  if (!process.env.DATABASE_URL) {
    const company = getMockCompany(companyId)
    return company ? company.reviews.slice(0, Math.min(Math.max(limit, 1), 50)).map(mockReviewToListItem) : []
  }

  const { db } = await import("@/db/client")
  const rows = await db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.companyId, companyId),
        inArray(reviews.status, ["visible", "limited_visible"]),
        isNull(reviews.deletedAt),
      ),
    )
    .orderBy(desc(reviews.usefulCount), desc(reviews.createdAt), desc(reviews.id))
    .limit(Math.min(Math.max(limit, 1), 50))

  const authUser = await getAuthUser()
  const blockedAuthors = await getBlockedReviewAuthorKeys(authUser?.userId)
  const visibleRows = rows.filter((row) => !isReviewAuthorBlocked(row, blockedAuthors))
  const metadata = await getPublicReviewMetadata(visibleRows, authUser?.userId)

  return visibleRows.map((row) =>
    toReviewListItem(row, toPublicReviewView(row, metadata.get(row.id)))
  )
}

export async function getPublicReviewDetail(
  companyId: string,
  reviewId: string
): Promise<ReviewListItem | null> {
  if (!process.env.DATABASE_URL) {
    const company = getMockCompany(companyId)
    const review = company?.reviews.find((item) => item.id === reviewId)
    return review ? mockReviewToListItem(review) : null
  }

  const row = await findPublicReview(reviewId, companyId)
  if (!row) return null

  const authUser = await getAuthUser()
  const blockedAuthors = await getBlockedReviewAuthorKeys(authUser?.userId)
  if (isReviewAuthorBlocked(row, blockedAuthors)) return null
  const metadata = await getPublicReviewMetadata([row], authUser?.userId)
  return toReviewListItem(
    row,
    toPublicReviewView(row, metadata.get(row.id))
  )
}

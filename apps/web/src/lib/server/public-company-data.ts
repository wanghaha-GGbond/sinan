import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"

import { companies } from "@/db/schema/companies"
import { reviews } from "@/db/schema/reviews"
import type { CompanyListItem, ReviewListItem } from "@/lib/types"
import { toPublicCompanyView } from "@/lib/server/company-view"
import { toPublicReviewView } from "@/lib/server/review-view"

export async function getPublicCompanyDetail(
  companyId: string,
): Promise<CompanyListItem | null> {
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
  }
}

export async function getPublicCompanyReviews(
  companyId: string,
  limit = 50,
): Promise<ReviewListItem[]> {
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

  return rows.map((row) => {
    const view = toPublicReviewView(row)
    const tags =
      row.questionnaire && typeof row.questionnaire === "object" && !Array.isArray(row.questionnaire)
        ? ((row.questionnaire as Record<string, unknown>).tags as string[] | undefined) ?? null
        : null

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
      discussionCount: view.discussionCount,
      status: view.status,
      createdAt: view.createdAt,
      tags,
    }
  })
}

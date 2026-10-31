import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm"
import { companies } from "@/db/schema/companies"
import { reviews } from "@/db/schema/reviews"
import { reviewDiscussions } from "@/db/schema/review-discussions"
import type { CommunityFeedItem, CommunityFilters } from "@/lib/community-types"
import { getBlockedReviewAuthorKeys, isReviewAuthorBlocked } from "./public-review-query"
import { toPublicReviewDiscussionView } from "./review-discussion-view"

/** Only approved discussions on public reviews/companies, never preview fixtures. */
export async function getCommunityFeed(filters: CommunityFilters, currentUserId?: string): Promise<CommunityFeedItem[]> {
  if (!process.env.DATABASE_URL) throw new Error("Database unavailable")
  const { db } = await import("@/db/client")
  const conditions = [
    inArray(reviewDiscussions.status, ["visible", "limited_visible"]),
    eq(reviewDiscussions.visibleToPublic, true),
    isNull(reviewDiscussions.deletedAt),
    inArray(reviews.status, ["visible", "limited_visible"]),
    isNull(reviews.deletedAt),
    eq(companies.reviewStatus, "reviewable"),
    isNull(companies.deletedAt),
  ]
  if (filters.companyId) conditions.push(eq(companies.id, filters.companyId))
  if (filters.industry) conditions.push(eq(companies.industry, filters.industry))
  if (filters.city) conditions.push(eq(companies.city, filters.city))
  if (filters.type) conditions.push(eq(reviewDiscussions.type, filters.type))
  const order = filters.sort === "company" ? [asc(companies.name), desc(reviewDiscussions.createdAt), desc(reviewDiscussions.id)]
    : filters.sort === "latest" ? [desc(reviewDiscussions.createdAt), desc(reviewDiscussions.id)]
    : [desc(reviewDiscussions.usefulCount), desc(reviewDiscussions.createdAt), desc(reviewDiscussions.id)]
  const [rows, blocked] = await Promise.all([
    db.select({ discussion: reviewDiscussions, review: reviews, company: { id: companies.id, name: companies.name, industry: companies.industry, city: companies.city } })
      .from(reviewDiscussions)
      .innerJoin(reviews, and(eq(reviews.id, reviewDiscussions.reviewId), eq(reviews.companyId, reviewDiscussions.companyId)))
      .innerJoin(companies, eq(companies.id, reviewDiscussions.companyId))
      .where(and(...conditions)).orderBy(...order).limit(50),
    getBlockedReviewAuthorKeys(currentUserId),
  ])
  return rows.filter(({ discussion, review }) => !isReviewAuthorBlocked(discussion, blocked) && !isReviewAuthorBlocked(review, blocked)).map(({ discussion, company }) => {
    const view = toPublicReviewDiscussionView(discussion)
    return { id: view.id, reviewId: view.reviewId, companyId: company.id, companyName: company.name,
      industry: company.industry, city: company.city, type: discussion.type, authorLabel: view.authorLabel,
      content: view.content, usefulCount: view.usefulCount, tags: view.tags, createdAt: view.createdAt }
  })
}

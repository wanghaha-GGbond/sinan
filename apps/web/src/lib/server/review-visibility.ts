import { and, inArray, isNotNull, isNull, sql, type SQL } from "drizzle-orm"
import { reviews } from "@/db/schema/reviews"

/** Enforce the parent company's public state inside the review query itself. */
export function publicReviewCompanyCondition() {
  return sql`exists (select 1 from companies public_company
    where public_company.id = ${reviews.companyId}
      and public_company.review_status = 'reviewable'
      and public_company.deleted_at is null)`
}

/** Preserve the count of readable content separately from independent ratings. */
export function companyReviewHistoryCount(companyId: string | SQL) {
  return sql<number>`(select count(*) from reviews history_review
    where history_review.company_id = ${companyId}
      and history_review.status in ('visible', 'limited_visible')
      and history_review.deleted_at is null
      and exists (select 1 from companies history_company
        where history_company.id = history_review.company_id
          and history_company.review_status = 'reviewable'
          and history_company.deleted_at is null))`
}

/** Content history stays public; only the latest public rating per account counts.
 * Unattributed legacy/deleted-account rows cannot prove an independent sample. */
export function independentCompanyRatingCondition() {
  return and(
    inArray(reviews.status, ["visible", "limited_visible"]),
    isNull(reviews.deletedAt),
    isNotNull(reviews.authorUserId),
    publicReviewCompanyCondition(),
    sql`not exists (select 1 from reviews newer_rating
      where newer_rating.company_id = ${reviews.companyId}
        and newer_rating.author_user_id = ${reviews.authorUserId}
        and newer_rating.status in ('visible', 'limited_visible')
        and newer_rating.deleted_at is null
        and (newer_rating.created_at, newer_rating.id) > (${reviews.createdAt}, ${reviews.id}))`,
  )!
}

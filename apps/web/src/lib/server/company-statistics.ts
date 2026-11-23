import { sql } from "drizzle-orm"
import { reviews } from "@/db/schema/reviews"
import { companyReviewHistoryCount, independentCompanyRatingCondition } from "./review-visibility"

export type CompanyStatistics = {
  totalCount: number
  ratingCount: number
  avgDirection: number | null
  recommendCount: number
  signals: Array<{ authorUserId: string; directionScore: unknown; questionnaire: unknown }>
}

/** One review aggregation in the catalog query, rather than two additional
 * network queries. Author identifiers remain server-only and are not serialized.
 * Null questionnaires cannot contribute to CBTI; excluding them preserves its
 * minimum-five-structured-responses threshold and all scoring semantics. */
export function companyStatistics() {
  return sql<CompanyStatistics>`(
    select json_build_object(
      'totalCount', ${companyReviewHistoryCount(sql`companies.id`)},
      'ratingCount', count(*),
      'avgDirection', round(avg(${reviews.directionScore})::numeric, 1),
      'recommendCount', count(*) filter (where ${reviews.recommendToJoin} = true),
      'signals', coalesce(json_agg(json_build_object(
        'authorUserId', ${reviews.authorUserId}, 'directionScore', ${reviews.directionScore}, 'questionnaire', ${reviews.questionnaire}
      )) filter (where ${reviews.questionnaire} is not null), '[]'::json)
    ) from ${reviews}
    where ${reviews.companyId} = ${sql.identifier("companies")}.${sql.identifier("id")}
      and ${independentCompanyRatingCondition()}
  )`
}

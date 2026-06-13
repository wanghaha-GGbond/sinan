import type { InferSelectModel } from "drizzle-orm"
import type { reviews } from "@/db/schema/reviews"

/**
 * PublicReviewView — the whitelisted set of fields safe to return
 * in public API responses. All sensitive/internal fields are excluded.
 *
 * NEVER returned: authorUserId, anonymousProfileId, authorFingerprintHash,
 *   moderationReason, deletedAt
 */
export type PublicReviewView = {
  id: string
  companyId: string
  departmentId: string | null
  authorRole: string
  authorLabel: string
  title: string
  content: string | null
  summary: string | null
  directionScore: string
  recommendToJoin: boolean | null
  employmentStatus: string | null
  jobTitle: string | null
  city: string | null
  departmentHint: string | null
  questionnaire: unknown
  ratingDimensions: unknown
  officeExperienceScore: string | null
  usefulCount: number
  discussionCount: number
  status: string
  createdAt: string
  updatedAt: string
  reviewedAt: string | null
}

/**
 * Strip internal/sensitive fields from a review row before returning
 * to public API consumers. Uses a whitelist — even if a query accidentally
 * selects sensitive columns, they will not be serialized.
 *
 * When status = 'limited_visible', the maskedContent is returned as content
 * instead of the raw content field.
 */
export function toPublicReviewView(
  row: InferSelectModel<typeof reviews>
): PublicReviewView {
  const isLimited = row.status === "limited_visible"

  return {
    id: row.id,
    companyId: row.companyId,
    departmentId: row.departmentId,
    authorRole: row.authorRole,
    authorLabel: row.authorLabel,
    title: row.title,
    content: isLimited && row.maskedContent ? row.maskedContent : row.content,
    summary: row.summary,
    directionScore: String(row.directionScore),
    recommendToJoin: row.recommendToJoin,
    employmentStatus: row.employmentStatus,
    jobTitle: row.jobTitle,
    city: row.city,
    departmentHint: row.departmentHint,
    questionnaire: row.questionnaire,
    ratingDimensions: row.ratingDimensions,
    officeExperienceScore: row.officeExperienceScore
      ? String(row.officeExperienceScore)
      : null,
    usefulCount: row.usefulCount,
    discussionCount: row.discussionCount,
    status: row.status,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : String(row.updatedAt),
    reviewedAt: row.reviewedAt
      ? row.reviewedAt instanceof Date
        ? row.reviewedAt.toISOString()
        : String(row.reviewedAt)
      : null,
  }
}

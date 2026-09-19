import type { InferSelectModel } from "drizzle-orm"
import type { reviews } from "@/db/schema/reviews"
import { sanitizePublicQuestionnaire } from "@/lib/review-questionnaire"
import { reviewRatingDimensionsSchema } from "@/lib/review-ratings"

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
  isUsefulByCurrentUser: boolean
  discussionCount: number
  tags: string[]
  publicAuthor: {
    label: string
    role: string
    verificationLevel: "none" | "L1" | "L2"
    verifiedForCompany: boolean
  }
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
  row: InferSelectModel<typeof reviews>,
  metadata?: {
    companyVerificationLevel?: number | null
    isUsefulByCurrentUser?: boolean | null
  }
): PublicReviewView {
  const isLimited = row.status === "limited_visible"
  const rawVerificationLevel = Math.max(
    0,
    Number(metadata?.companyVerificationLevel ?? 0)
  )
  const verificationLevel = rawVerificationLevel >= 2
    ? "L2"
    : rawVerificationLevel >= 1
      ? "L1"
      : "none"
  const questionnaire = sanitizePublicQuestionnaire(row.questionnaire)
  const ratingDimensions = reviewRatingDimensionsSchema.safeParse(row.ratingDimensions)
  const tags = Array.isArray(questionnaire?.tags)
    ? questionnaire.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 8)
    : []

  return {
    id: row.id,
    companyId: row.companyId,
    departmentId: row.departmentId,
    authorRole: row.authorRole,
    authorLabel: row.authorLabel,
    title: row.title,
    // Limited visibility must fail closed. If moderation did not produce a
    // mask, never fall back to the original potentially sensitive content.
    content: isLimited ? row.maskedContent : row.content,
    summary: row.summary,
    directionScore: String(row.directionScore),
    recommendToJoin: row.recommendToJoin,
    employmentStatus: row.employmentStatus,
    jobTitle: row.jobTitle,
    city: row.city,
    departmentHint: row.departmentHint,
    questionnaire,
    ratingDimensions: ratingDimensions.success ? ratingDimensions.data : null,
    officeExperienceScore: row.officeExperienceScore
      ? String(row.officeExperienceScore)
      : null,
    usefulCount: row.usefulCount,
    isUsefulByCurrentUser: Boolean(metadata?.isUsefulByCurrentUser),
    discussionCount: row.discussionCount,
    tags,
    publicAuthor: {
      label: row.authorLabel,
      role: row.authorRole,
      verificationLevel,
      verifiedForCompany: verificationLevel !== "none",
    },
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

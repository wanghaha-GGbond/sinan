import type { InferSelectModel } from "drizzle-orm"
import type { reviewDiscussions } from "@/db/schema/review-discussions"

/**
 * PublicReviewDiscussionView — the whitelisted set of fields safe to return
 * in public API responses. All sensitive/internal fields are excluded.
 *
 * NEVER returned: authorUserId, anonymousProfileId, authorFingerprintHash,
 *   moderationReason, deletedAt
 */
export type PublicReviewDiscussionView = {
  id: string
  reviewId: string
  companyId: string
  type: string
  authorRole: string
  authorLabel: string
  content: string | null
  status: string
  usefulCount: number
  replyCount: number
  tags: string[] | null
  visibleToPublic: boolean
  participatesInRanking: boolean
  score: string | null
  createdAt: string
  updatedAt: string
  reviewedAt: string | null
}

/**
 * Strip internal/sensitive fields from a discussion row before returning
 * to public API consumers. Uses a whitelist — even if a query accidentally
 * selects sensitive columns, they will not be serialized.
 *
 * When status = 'limited_visible', the maskedContent is returned as content
 * instead of the raw content field.
 */
export function toPublicReviewDiscussionView(
  row: InferSelectModel<typeof reviewDiscussions>
): PublicReviewDiscussionView {
  const isLimited = row.status === "limited_visible"

  return {
    id: row.id,
    reviewId: row.reviewId,
    companyId: row.companyId,
    type: row.type,
    authorRole: row.authorRole,
    authorLabel: row.authorLabel,
    content: isLimited && row.maskedContent ? row.maskedContent : row.content,
    status: row.status,
    usefulCount: row.usefulCount,
    replyCount: row.replyCount,
    tags: row.tags,
    visibleToPublic: row.visibleToPublic,
    participatesInRanking: row.participatesInRanking,
    score: row.score ? String(row.score) : null,
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

import { pgEnum } from "drizzle-orm/pg-core"

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "moderator",
  "admin",
])

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "deleted",
])

export const anonymousScopeTypeEnum = pgEnum("anonymous_scope_type", [
  "global",
  "company",
  "review",
  "discussion",
])

export const companyReviewStatusEnum = pgEnum("company_review_status", [
  "pending_review",
  "reviewable",
  "rejected",
])

export const companyClaimedStatusEnum = pgEnum("company_claimed_status", [
  "unclaimed",
  "claimed",
])

export const companySourceEnum = pgEnum("company_source", [
  "platform_seed",
  "user_added",
  "platform_verified",
  "import",
])

export const reviewStatusEnum = pgEnum("review_status", [
  "draft",
  "pending_review",
  "visible",
  "limited_visible",
  "hidden",
  "rejected",
  "deleted_by_author",
])

export const reviewAuthorRoleEnum = pgEnum("review_author_role", [
  "job_seeker",
  "current_employee",
  "former_employee",
  "interviewee",
  "intern",
  "contractor",
  "anonymous",
])

export const reviewModerationReasonEnum = pgEnum("review_moderation_reason", [
  "sensitive_info",
  "personal_attack",
  "privacy",
  "spam",
  "off_topic",
  "duplicate",
  "author_deleted",
  "none",
])

export const reviewDiscussionTypeEnum = pgEnum("review_discussion_type", [
  "question",
  "supplement",
])

export const reviewDiscussionStatusEnum = pgEnum("review_discussion_status", [
  "draft",
  "local_pending",
  "pending_review",
  "visible",
  "limited_visible",
  "hidden",
  "rejected",
  "deleted_by_author",
])

export const reviewDiscussionModerationReasonEnum = pgEnum(
  "review_discussion_moderation_reason",
  [
    "sensitive_info",
    "personal_attack",
    "privacy",
    "spam",
    "off_topic",
    "duplicate",
    "author_deleted",
    "none",
  ]
)

export const discussionModerationActorRoleEnum = pgEnum(
  "discussion_moderation_actor_role",
  ["system", "moderator", "author"]
)

export const reviewReportReasonEnum = pgEnum("review_report_reason", [
  "personal_attack",
  "privacy",
  "rumor",
  "mob",
  "leader_dox",
  "ai_spam",
  "competitor",
  "company_astro",
  "duplicate",
  "other",
])

export const reviewReportStatusEnum = pgEnum("review_report_status", [
  "open",
  "reviewing",
  "actioned",
  "dismissed",
])

export const companyCorrectionFieldEnum = pgEnum("company_correction_field", [
  "name",
  "registeredName",
  "industry",
  "city",
  "size",
  "stage",
  "description",
  "website",
  "other",
])

export const companyCorrectionStatusEnum = pgEnum(
  "company_correction_status",
  ["submitted", "reviewing", "approved", "rejected"]
)

export const companyAppealReasonEnum = pgEnum("company_appeal_reason", [
  "personal_attack",
  "dox_leader",
  "fake_fact",
  "rumor",
  "ai_spam",
  "competitor",
  "other",
])

export const companyAppealStatusEnum = pgEnum("company_appeal_status", [
  "submitted",
  "reviewing",
  "upheld",
  "rejected",
])

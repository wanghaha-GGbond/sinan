import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import {
  reviewDiscussionTypeEnum,
  reviewDiscussionStatusEnum,
  reviewDiscussionModerationReasonEnum,
  reviewAuthorRoleEnum,
} from "./enums"
import { reviews } from "./reviews"
import { companies } from "./companies"
import { users } from "./users"
import { anonymousProfiles } from "./anonymous-profiles"

export const reviewDiscussions = pgTable(
  "review_discussions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),

    authorUserId: uuid("author_user_id").references(() => users.id),
    anonymousProfileId: uuid("anonymous_profile_id").references(
      () => anonymousProfiles.id
    ),
    authorFingerprintHash: text("author_fingerprint_hash"),

    type: reviewDiscussionTypeEnum("type").notNull(),
    authorRole: reviewAuthorRoleEnum("author_role")
      .default("anonymous")
      .notNull(),
    authorLabel: text("author_label").notNull(),

    content: text("content").notNull(),
    maskedContent: text("masked_content"),

    status: reviewDiscussionStatusEnum("status")
      .default("pending_review")
      .notNull(),
    moderationReason: reviewDiscussionModerationReasonEnum("moderation_reason"),

    usefulCount: integer("useful_count").default(0).notNull(),
    replyCount: integer("reply_count").default(0).notNull(),

    tags: text("tags").array(),

    source: text("source").default("api").notNull(),
    createdByCurrentUser: boolean("created_by_current_user"),
    pendingSync: boolean("pending_sync").default(false).notNull(),

    visibleToAuthor: boolean("visible_to_author").default(true).notNull(),
    visibleToPublic: boolean("visible_to_public").default(false).notNull(),
    participatesInRanking: boolean("participates_in_ranking")
      .default(false)
      .notNull(),

    score: numeric("score"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("review_discussions_review_public_idx")
      .on(table.reviewId, table.status, table.createdAt)
      .where(
        sql`${table.status} IN ('visible', 'limited_visible') AND ${table.deletedAt} IS NULL`
      ),
    index("review_discussions_review_useful_idx")
      .on(table.reviewId, table.usefulCount)
      .where(
        sql`${table.status} IN ('visible', 'limited_visible') AND ${table.deletedAt} IS NULL`
      ),
    index("review_discussions_company_idx")
      .on(table.companyId, table.createdAt)
      .where(sql`${table.deletedAt} IS NULL`),
    index("review_discussions_author_user_idx")
      .on(table.authorUserId, table.createdAt)
      .where(
        sql`${table.authorUserId} IS NOT NULL AND ${table.deletedAt} IS NULL`
      ),
    index("review_discussions_anonymous_profile_idx")
      .on(table.anonymousProfileId, table.createdAt)
      .where(
        sql`${table.anonymousProfileId} IS NOT NULL AND ${table.deletedAt} IS NULL`
      ),
    index("review_discussions_status_idx")
      .on(table.status, table.createdAt)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
)

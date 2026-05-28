import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { reviewStatusEnum, reviewAuthorRoleEnum, reviewModerationReasonEnum } from "./enums"
import { companies } from "./companies"
import { users } from "./users"
import { anonymousProfiles } from "./anonymous-profiles"

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),

    authorUserId: uuid("author_user_id").references(() => users.id),
    anonymousProfileId: uuid("anonymous_profile_id").references(
      () => anonymousProfiles.id
    ),
    authorFingerprintHash: text("author_fingerprint_hash"),

    authorRole: reviewAuthorRoleEnum("author_role").default("anonymous").notNull(),
    authorLabel: text("author_label").notNull(),

    title: text("title").notNull(),
    content: text("content").notNull(),
    summary: text("summary"),

    directionScore: numeric("direction_score", { precision: 3, scale: 1 }).notNull(),
    recommendToJoin: boolean("recommend_to_join"),

    employmentStatus: text("employment_status"),
    jobTitle: text("job_title"),
    city: text("city"),
    departmentHint: text("department_hint"),

    questionnaire: jsonb("questionnaire"),
    officeExperienceScore: numeric("office_experience_score", {
      precision: 3,
      scale: 1,
    }),

    usefulCount: integer("useful_count").default(0).notNull(),
    discussionCount: integer("discussion_count").default(0).notNull(),

    status: reviewStatusEnum("status").default("pending_review").notNull(),
    moderationReason: reviewModerationReasonEnum("moderation_reason"),
    maskedContent: text("masked_content"),

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
    index("reviews_company_visible_idx")
      .on(table.companyId, table.status, table.createdAt)
      .where(
        sql`${table.status} IN ('visible', 'limited_visible') AND ${table.deletedAt} IS NULL`
      ),
    index("reviews_company_useful_idx")
      .on(table.companyId, table.usefulCount)
      .where(
        sql`${table.status} IN ('visible', 'limited_visible') AND ${table.deletedAt} IS NULL`
      ),
    index("reviews_author_user_idx")
      .on(table.authorUserId, table.createdAt)
      .where(
        sql`${table.authorUserId} IS NOT NULL AND ${table.deletedAt} IS NULL`
      ),
    index("reviews_anonymous_profile_idx")
      .on(table.anonymousProfileId, table.createdAt)
      .where(
        sql`${table.anonymousProfileId} IS NOT NULL AND ${table.deletedAt} IS NULL`
      ),
    index("reviews_status_idx")
      .on(table.status, table.createdAt)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
)

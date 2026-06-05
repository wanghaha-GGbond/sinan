import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import {
  reviewReportReasonEnum,
  reviewReportStatusEnum,
} from "./enums"
import { reviews } from "./reviews"
import { companies } from "./companies"
import { users } from "./users"
import { anonymousProfiles } from "./anonymous-profiles"

export const reviewReports = pgTable(
  "review_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id),
    // denormalized for fast moderator filters and "company-side" views
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),

    reporterUserId: uuid("reporter_user_id").references(() => users.id),
    reporterAnonymousProfileId: uuid("reporter_anonymous_profile_id").references(
      () => anonymousProfiles.id
    ),
    reporterFingerprintHash: text("reporter_fingerprint_hash"),

    reason: reviewReportReasonEnum("reason").notNull(),
    note: text("note"),

    status: reviewReportStatusEnum("status")
      .default("open")
      .notNull(),

    moderatorUserId: uuid("moderator_user_id").references(() => users.id),
    moderationNote: text("moderation_note"),
    actionTaken: text("action_taken"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    actionedAt: timestamp("actioned_at", { withTimezone: true }),
  },
  (table) => [
    // One open report per (reporter, review) — only enforced when the reporter
    // is a logged-in user. Anonymous / fingerprint reports are best-effort
    // deduped but not unique-indexed to allow fallback paths.
    uniqueIndex("review_reports_reporter_review_unique")
      .on(table.reporterUserId, table.reviewId)
      .where(sql`${table.reporterUserId} IS NOT NULL`),
    index("review_reports_review_idx").on(table.reviewId, table.createdAt),
    index("review_reports_company_idx").on(table.companyId, table.createdAt),
    index("review_reports_status_idx").on(table.status, table.createdAt),
    index("review_reports_moderator_idx").on(
      table.moderatorUserId,
      table.actionedAt
    ),
  ]
)

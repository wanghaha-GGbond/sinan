import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core"
import { companyAppealReasonEnum, companyAppealStatusEnum } from "./enums"
import { companies } from "./companies"
import { reviews } from "./reviews"
import { users } from "./users"
import { anonymousProfiles } from "./anonymous-profiles"

export const companyAppeals = pgTable(
  "company_appeals",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id),

    submitterUserId: uuid("submitter_user_id").references(() => users.id),
    submitterAnonymousProfileId: uuid("submitter_anonymous_profile_id").references(
      () => anonymousProfiles.id
    ),
    submitterFingerprintHash: text("submitter_fingerprint_hash"),
    contactEmail: text("contact_email"),

    reason: companyAppealReasonEnum("reason").notNull(),
    note: text("note"),

    status: companyAppealStatusEnum("status")
      .default("submitted")
      .notNull(),

    moderatorUserId: uuid("moderator_user_id").references(() => users.id),
    moderationNote: text("moderation_note"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    actionedAt: timestamp("actioned_at", { withTimezone: true }),
  },
  (table) => [
    index("company_appeals_company_idx").on(table.companyId, table.createdAt),
    index("company_appeals_review_idx").on(table.reviewId, table.createdAt),
    index("company_appeals_status_idx").on(table.status, table.createdAt),
    index("company_appeals_moderator_idx").on(
      table.moderatorUserId,
      table.actionedAt
    ),
  ]
)

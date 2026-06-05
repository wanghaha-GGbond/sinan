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
  companyCorrectionFieldEnum,
  companyCorrectionStatusEnum,
} from "./enums"
import { companies } from "./companies"
import { users } from "./users"
import { anonymousProfiles } from "./anonymous-profiles"

export const companyCorrections = pgTable(
  "company_corrections",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),

    submitterUserId: uuid("submitter_user_id").references(() => users.id),
    submitterAnonymousProfileId: uuid("submitter_anonymous_profile_id").references(
      () => anonymousProfiles.id
    ),
    submitterFingerprintHash: text("submitter_fingerprint_hash"),
    contactEmail: text("contact_email"),

    field: companyCorrectionFieldEnum("field").notNull(),
    currentValue: text("current_value").notNull(),
    proposedValue: text("proposed_value").notNull(),
    reason: text("reason"),

    status: companyCorrectionStatusEnum("status")
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
    // One open correction per (submitter, company, field) — partial unique
    // for logged-in submitters. Anonymous dedup is best-effort.
    uniqueIndex("company_corrections_submitter_field_unique")
      .on(table.submitterUserId, table.companyId, table.field)
      .where(
        sql`${table.submitterUserId} IS NOT NULL AND ${table.status} IN ('submitted', 'reviewing')`
      ),
    index("company_corrections_company_idx").on(
      table.companyId,
      table.createdAt
    ),
    index("company_corrections_status_idx").on(table.status, table.createdAt),
    index("company_corrections_moderator_idx").on(
      table.moderatorUserId,
      table.actionedAt
    ),
  ]
)

import { date, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

import { anonymousProfiles } from "./anonymous-profiles"
import { companies } from "./companies"
import { departments } from "./departments"
import { users } from "./users"

export const promiseOutcomeStatusEnum = pgEnum("promise_outcome_status", [
  "kept",
  "partial",
  "broken",
])

export const promiseRecordStatusEnum = pgEnum("promise_record_status", [
  "pending_review",
  "visible",
  "rejected",
  "hidden",
])

export const promiseRecords = pgTable(
  "promise_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    departmentId: uuid("department_id").references(() => departments.id),
    authorUserId: uuid("author_user_id").notNull().references(() => users.id),
    anonymousProfileId: uuid("anonymous_profile_id").references(() => anonymousProfiles.id),
    promiseCategory: text("promise_category").notNull(),
    promiseText: text("promise_text").notNull(),
    promiseDate: date("promise_date").notNull(),
    outcomeText: text("outcome_text").notNull(),
    outcomeStatus: promiseOutcomeStatusEnum("outcome_status").notNull(),
    evidenceType: text("evidence_type").notNull(),
    evidenceFingerprint: text("evidence_fingerprint").notNull(),
    status: promiseRecordStatusEnum("status").default("pending_review").notNull(),
    moderationReason: text("moderation_reason"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("promise_records_company_public_idx")
      .on(table.companyId, table.status, table.promiseDate)
      .where(sql`${table.status} = 'visible' AND ${table.deletedAt} IS NULL`),
    index("promise_records_moderation_idx").on(table.status, table.createdAt),
    index("promise_records_author_idx").on(table.authorUserId, table.createdAt),
  ]
)

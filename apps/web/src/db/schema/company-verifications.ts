import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

import {
  companyVerificationProofTypeEnum,
  companyVerificationStatusEnum,
} from "./enums"
import { companies } from "./companies"
import { users } from "./users"

export const companyVerifications = pgTable(
  "company_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    companyName: text("company_name").notNull(),
    applicantUserId: uuid("applicant_user_id")
      .notNull()
      .references(() => users.id),
    applicantName: text("applicant_name").notNull(),
    workEmail: text("work_email").notNull(),
    jobTitle: text("job_title").notNull(),
    proofType: companyVerificationProofTypeEnum("proof_type").notNull(),
    note: text("note"),
    status: companyVerificationStatusEnum("status").default("submitted").notNull(),

    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectReason: text("reject_reason"),
    grantedTrustLevel: integer("granted_trust_level"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("company_verifications_open_request_unique")
      .on(table.companyId, table.applicantUserId)
      .where(sql`${table.status} IN ('submitted', 'reviewing')`),
    index("company_verifications_status_idx").on(table.status, table.createdAt),
    index("company_verifications_company_idx").on(table.companyId, table.createdAt),
    index("company_verifications_applicant_idx").on(
      table.applicantUserId,
      table.createdAt
    ),
  ]
)

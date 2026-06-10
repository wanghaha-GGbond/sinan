import {
  index,
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

export const companyVerifications = pgTable(
  "company_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: text("company_id").notNull(),
    companyName: text("company_name").notNull(),
    applicantUserId: text("applicant_user_id").notNull(),
    applicantName: text("applicant_name").notNull(),
    workEmail: text("work_email").notNull(),
    jobTitle: text("job_title").notNull(),
    proofType: companyVerificationProofTypeEnum("proof_type").notNull(),
    note: text("note"),
    status: companyVerificationStatusEnum("status").default("submitted").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("company_verifications_open_request_unique")
      .on(table.companyId, table.applicantUserId)
      .where(sql`${table.status} IN ('submitted', 'reviewing')`),
    index("company_verifications_status_idx").on(table.status, table.createdAt),
    index("company_verifications_company_idx").on(table.companyId, table.createdAt),
  ]
)

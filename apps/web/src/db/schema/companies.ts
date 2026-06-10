import {
  pgTable,
  uuid,
  text,
  date,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { companyReviewStatusEnum, companyClaimedStatusEnum, companySourceEnum } from "./enums"
import { users } from "./users"
import { anonymousProfiles } from "./anonymous-profiles"

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: text("name").notNull(),
    registeredName: text("registered_name"),
    shortName: text("short_name"),
    englishName: text("english_name"),
    aliases: text("aliases").array(),

    unifiedSocialCreditCode: text("unified_social_credit_code"),
    registeredAddress: text("registered_address"),
    legalRepresentative: text("legal_representative"),
    businessStatus: text("business_status"),
    foundedDate: date("founded_date"),

    city: text("city").notNull(),
    industry: text("industry").notNull(),
    size: text("size"),
    financingStage: text("financing_stage"),
    website: text("website"),
    logoUrl: text("logo_url"),
    description: text("description"),

    source: companySourceEnum("source").default("user_added").notNull(),
    reviewStatus: companyReviewStatusEnum("review_status").default("pending_review").notNull(),
    claimedStatus: companyClaimedStatusEnum("claimed_status").default("unclaimed").notNull(),
    verifiedIdentityCount: integer("verified_identity_count").default(0).notNull(),

    submittedByUserId: uuid("submitted_by_user_id").references(() => users.id),
    submittedByAnonymousProfileId: uuid("submitted_by_anonymous_profile_id").references(
      () => anonymousProfiles.id
    ),

    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("companies_credit_code_unique")
      .on(table.unifiedSocialCreditCode)
      .where(
        sql`${table.unifiedSocialCreditCode} IS NOT NULL AND ${table.deletedAt} IS NULL`
      ),
    uniqueIndex("companies_registered_name_unique")
      .on(table.registeredName)
      .where(
        sql`${table.registeredName} IS NOT NULL AND ${table.reviewStatus} != 'rejected' AND ${table.deletedAt} IS NULL`
      ),
    index("companies_review_status_idx").on(table.reviewStatus, table.createdAt),
    index("companies_city_industry_idx").on(table.city, table.industry),
    index("companies_name_idx").on(table.name),
    index("companies_registered_name_idx").on(table.registeredName),
    index("companies_submitted_by_user_idx").on(table.submittedByUserId, table.createdAt),
    index("companies_submitted_by_anon_idx").on(
      table.submittedByAnonymousProfileId,
      table.createdAt
    ),
  ]
)

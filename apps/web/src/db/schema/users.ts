import { pgTable, uuid, text, integer, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { userRoleEnum, userStatusEnum } from "./enums"

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    email: text("email"),
    phone: text("phone"),
    passwordHash: text("password_hash"),

    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),

    role: userRoleEnum("role").default("user").notNull(),
    status: userStatusEnum("status").default("active").notNull(),

    trustLevel: integer("trust_level").default(0).notNull(),
    reputationScore: integer("reputation_score").default(0).notNull(),

    jobBand: text("job_band"),
    yearsOfExperience: integer("years_of_experience"),
    highlightMoment: text("highlight_moment"),
    declinedOffer: text("declined_offer"),
    profileFieldsStatus: jsonb("profile_fields_status").$type<Record<string, "pending" | "approved" | "rejected">>(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("users_email_unique")
      .on(table.email)
      .where(sql`${table.email} IS NOT NULL AND ${table.deletedAt} IS NULL`),
    uniqueIndex("users_phone_unique")
      .on(table.phone)
      .where(sql`${table.phone} IS NOT NULL AND ${table.deletedAt} IS NULL`),
    index("users_status_idx").on(table.status),
    index("users_created_at_idx").on(table.createdAt),
    index("users_trust_level_idx").on(table.trustLevel),
  ]
)

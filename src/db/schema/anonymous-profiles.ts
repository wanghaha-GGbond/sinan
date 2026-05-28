import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { anonymousScopeTypeEnum } from "./enums"
import { users } from "./users"

export const anonymousProfiles = pgTable(
  "anonymous_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id").references(() => users.id),
    scopeType: anonymousScopeTypeEnum("scope_type").notNull(),
    scopeId: uuid("scope_id"),

    displayLabel: text("display_label").notNull(),
    avatarSeed: text("avatar_seed"),

    fingerprintHash: text("fingerprint_hash"),
    trustLevel: integer("trust_level").default(0).notNull(),

    isCurrent: boolean("is_current").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("anon_profiles_user_scope_unique")
      .on(table.userId, table.scopeType, table.scopeId)
      .where(sql`${table.userId} IS NOT NULL AND ${table.deletedAt} IS NULL`),
    uniqueIndex("anon_profiles_fingerprint_scope_unique")
      .on(table.fingerprintHash, table.scopeType, table.scopeId)
      .where(sql`${table.fingerprintHash} IS NOT NULL AND ${table.deletedAt} IS NULL`),
    index("anon_profiles_user_idx").on(table.userId),
    index("anon_profiles_scope_idx").on(table.scopeType, table.scopeId),
    index("anon_profiles_fingerprint_idx").on(table.fingerprintHash),
    index("anon_profiles_last_used_idx").on(table.lastUsedAt),
  ]
)

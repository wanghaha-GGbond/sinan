import {
  index,
  check,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  text,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

import { anonymousProfiles } from "./anonymous-profiles"
import { users } from "./users"

/**
 * Viewer-scoped author blocks for user generated reviews.
 *
 * The public API never exposes any of these keys. They are resolved from a
 * review on the server so an anonymous reviewer remains unlinkable to users.
 * Exactly one target key is populated for each row.
 */
export const reviewAuthorBlocks = pgTable(
  "review_author_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    blockerUserId: uuid("blocker_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedAuthorUserId: uuid("blocked_author_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    blockedAnonymousProfileId: uuid("blocked_anonymous_profile_id").references(
      () => anonymousProfiles.id,
      { onDelete: "cascade" },
    ),
    blockedAuthorFingerprintHash: text("blocked_author_fingerprint_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "review_author_blocks_one_target_check",
      sql`(${table.blockedAuthorUserId} IS NOT NULL)::int + (${table.blockedAnonymousProfileId} IS NOT NULL)::int + (${table.blockedAuthorFingerprintHash} IS NOT NULL)::int = 1`,
    ),
    uniqueIndex("review_author_blocks_blocker_user_unique")
      .on(table.blockerUserId, table.blockedAuthorUserId)
      .where(sql`${table.blockedAuthorUserId} IS NOT NULL`),
    uniqueIndex("review_author_blocks_blocker_profile_unique")
      .on(table.blockerUserId, table.blockedAnonymousProfileId)
      .where(sql`${table.blockedAnonymousProfileId} IS NOT NULL`),
    uniqueIndex("review_author_blocks_blocker_fingerprint_unique")
      .on(table.blockerUserId, table.blockedAuthorFingerprintHash)
      .where(sql`${table.blockedAuthorFingerprintHash} IS NOT NULL`),
    index("review_author_blocks_blocker_idx").on(table.blockerUserId, table.createdAt),
  ]
)

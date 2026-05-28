import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { reviewDiscussions } from "./review-discussions"
import { users } from "./users"
import { anonymousProfiles } from "./anonymous-profiles"

export const discussionUsefulVotes = pgTable(
  "discussion_useful_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    discussionId: uuid("discussion_id")
      .notNull()
      .references(() => reviewDiscussions.id),

    userId: uuid("user_id").references(() => users.id),
    anonymousProfileId: uuid("anonymous_profile_id").references(
      () => anonymousProfiles.id
    ),
    voterFingerprintHash: text("voter_fingerprint_hash"),

    useful: boolean("useful").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("discussion_votes_user_unique")
      .on(table.discussionId, table.userId)
      .where(
        sql`${table.userId} IS NOT NULL AND ${table.deletedAt} IS NULL`
      ),
    uniqueIndex("discussion_votes_anon_unique")
      .on(table.discussionId, table.anonymousProfileId)
      .where(
        sql`${table.anonymousProfileId} IS NOT NULL AND ${table.deletedAt} IS NULL`
      ),
    uniqueIndex("discussion_votes_fingerprint_unique")
      .on(table.discussionId, table.voterFingerprintHash)
      .where(
        sql`${table.voterFingerprintHash} IS NOT NULL AND ${table.deletedAt} IS NULL`
      ),
    index("discussion_votes_discussion_idx").on(table.discussionId),
    index("discussion_votes_user_idx").on(table.userId, table.createdAt),
    index("discussion_votes_anon_idx").on(
      table.anonymousProfileId,
      table.createdAt
    ),
  ]
)

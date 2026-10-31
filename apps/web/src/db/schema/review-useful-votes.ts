import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { reviews } from "./reviews"
import { users } from "./users"

/**
 * Persistent review usefulness votes.
 *
 * A row is retained when a user removes their vote so repeated toggles remain
 * idempotent and the unique constraint continues to protect against duplicate
 * votes under concurrency.
 */
export const reviewUsefulVotes = pgTable(
  "review_useful_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    useful: boolean("useful").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("review_useful_votes_review_user_unique").on(
      table.reviewId,
      table.userId
    ),
    index("review_useful_votes_review_idx").on(table.reviewId, table.useful),
    index("review_useful_votes_user_idx").on(table.userId, table.updatedAt),
  ]
)

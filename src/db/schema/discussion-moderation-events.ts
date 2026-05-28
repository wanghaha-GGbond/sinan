import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core"
import { discussionModerationActorRoleEnum } from "./enums"
import { reviewDiscussions } from "./review-discussions"
import { users } from "./users"

export const discussionModerationEvents = pgTable(
  "discussion_moderation_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    discussionId: uuid("discussion_id")
      .notNull()
      .references(() => reviewDiscussions.id),

    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorRole: discussionModerationActorRoleEnum("actor_role").notNull(),

    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),

    reason: text("reason"),
    note: text("note"),

    rawContentSnapshot: text("raw_content_snapshot"),
    maskedContentSnapshot: text("masked_content_snapshot"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("moderation_events_discussion_idx").on(
      table.discussionId,
      table.createdAt
    ),
    index("moderation_events_actor_idx").on(
      table.actorUserId,
      table.createdAt
    ),
    index("moderation_events_to_status_idx").on(
      table.toStatus,
      table.createdAt
    ),
  ]
)

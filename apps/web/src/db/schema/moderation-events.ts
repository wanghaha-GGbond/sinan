import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { users } from "./users"

export const moderationEvents = pgTable(
  "moderation_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorRole: text("actor_role").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("moderation_events_entity_idx").on(table.entityType, table.entityId, table.createdAt),
    index("moderation_events_actor_idx").on(table.actorUserId, table.createdAt),
  ]
)

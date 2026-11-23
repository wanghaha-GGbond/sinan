import { sql } from "drizzle-orm"
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { users } from "./users"
import { dialogueSessions } from "./dialogues"

export const pointAccounts = pgTable("point_accounts", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  available: integer("available").notNull().default(0), frozen: integer("frozen").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [check("point_account_bounds", sql`${t.available} >= 0 AND ${t.frozen} >= 0 AND ${t.available} + ${t.frozen} <= 1000000`)])
export const pointEntries = pgTable("point_entries", {
  id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  operationKey: text("operation_key").notNull(), kind: text("kind").notNull(),
  availableDelta: integer("available_delta").notNull(), frozenDelta: integer("frozen_delta").notNull(),
  availableAfter: integer("available_after").notNull(), frozenAfter: integer("frozen_after").notNull(),
  sessionId: uuid("session_id").references(() => dialogueSessions.id, { onDelete: "set null" }),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  reason: text("reason").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, t => [uniqueIndex("point_entry_once").on(t.userId, t.operationKey), index("point_entry_owner").on(t.userId, t.createdAt, t.id),
  check("point_entry_kind", sql`${t.kind} IN ('task','activity','hold','release','spend','refund')`),
  check("point_entry_bounds", sql`${t.availableAfter} >= 0 AND ${t.frozenAfter} >= 0 AND ${t.availableAfter} + ${t.frozenAfter} <= 1000000`),
  check("point_entry_delta", sql`${t.availableDelta} <> 0 OR ${t.frozenDelta} <> 0`),
])

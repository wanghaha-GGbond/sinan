import { date, integer, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core"
import { users } from "./users"

export const pulseCheckins = pgTable("pulse_checkins", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  energy: integer("energy").notNull(),
  pressure: integer("pressure").notNull(),
  workMinutes: integer("work_minutes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.userId, table.day] })])

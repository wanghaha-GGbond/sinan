import { date, index, integer, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core"
import { users } from "./users"
import { companies } from "./companies"

export const pulseCheckins = pgTable("pulse_checkins", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  energy: integer("energy").notNull(),
  pressure: integer("pressure").notNull(),
  workMinutes: integer("work_minutes"),
  endMinute: integer("end_minute"),
  // Null unless the user opted in and the server verified company eligibility.
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.userId, table.day] }), index("pulse_company_day_idx").on(table.companyId, table.day)])

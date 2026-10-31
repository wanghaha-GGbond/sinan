import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"

/** Shared, database-backed abuse buckets for multi-instance deployments. */
export const securityRateLimits = pgTable(
  "security_rate_limits",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(0),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("security_rate_limits_reset_idx").on(table.resetAt)],
)

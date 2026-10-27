import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

// One outstanding challenge per email. Neither email nor plaintext code is stored.
export const registrationCodes = pgTable("registration_codes", {
  emailHash: text("email_hash").primaryKey(),
  id: uuid("id").notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("registration_codes_expires_idx").on(table.expiresAt)])

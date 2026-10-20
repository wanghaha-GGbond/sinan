import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { users } from "./users"

// One outstanding link per account; no plaintext token or email is stored here.
export const passwordResetTokens = pgTable("password_reset_tokens", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique("password_reset_tokens_token_hash_key"),
  sessionVersion: integer("session_version").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("password_reset_tokens_expires_idx").on(table.expiresAt)])

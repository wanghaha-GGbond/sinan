import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"
import { pgEnum } from "drizzle-orm/pg-core"
import { users } from "./users"

export const inviteStatusEnum = pgEnum("invite_status", [
  "unused",
  "used",
  "revoked",
])

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    inviterUserId: uuid("inviter_user_id")
      .notNull()
      .references(() => users.id),
    invitedUserId: uuid("invited_user_id").references(() => users.id),
    status: inviteStatusEnum("status").default("unused").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    quotaReturnedAt: timestamp("quota_returned_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("invites_code_unique").on(table.code),
    index("invites_inviter_idx").on(table.inviterUserId, table.status),
    index("invites_invited_idx").on(table.invitedUserId),
  ]
)

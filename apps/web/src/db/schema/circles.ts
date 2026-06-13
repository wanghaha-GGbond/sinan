/**
 * M3 圈层 (circles) schema
 *
 * Per docs/04-spec-f3-growth.md §2:
 *   - circles: id, name, slug (unique), description, minTrustLevel,
 *     status (active/archived), createdAt
 *   - circle_members: circleId (FK), userId (FK), endorsedByUserId (FK users),
 *     joinedAt, status (pending/active/revoked)
 *   - slug 唯一索引, user 在一个 circle 里唯一
 *
 * Note: spec uses pending/active/revoked — 我们默认 1 步入圈(成员背书 = 即时
 * active), 留 pending 给运营手动复核流程;v1 入圈不走 pending 状态。
 */
import {
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { users } from "./users"

export const circleStatusEnum = pgEnum("circle_status", [
  "active",
  "archived",
])

export const circleMemberStatusEnum = pgEnum("circle_member_status", [
  "pending",
  "active",
  "revoked",
])

export const circles = pgTable(
  "circles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    minTrustLevel: integer("min_trust_level").notNull().default(1),
    status: circleStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("circles_slug_unique").on(table.slug),
    index("circles_status_idx").on(table.status),
  ]
)

export const circleMembers = pgTable(
  "circle_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endorsedByUserId: uuid("endorsed_by_user_id")
      .notNull()
      .references(() => users.id),
    status: circleMemberStatusEnum("status").default("active").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokeReason: text("revoke_reason"),
  },
  (table) => [
    // 一个 user 在一个 circle 里唯一
    uniqueIndex("circle_members_circle_user_unique").on(
      table.circleId,
      table.userId
    ),
    index("circle_members_user_idx").on(table.userId),
    index("circle_members_circle_status_idx").on(
      table.circleId,
      table.status
    ),
    foreignKey({
      columns: [table.endorsedByUserId],
      foreignColumns: [users.id],
      name: "circle_members_endorsed_by_users_id_fk",
    }),
  ]
)

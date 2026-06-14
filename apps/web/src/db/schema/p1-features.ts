/**
 * M3 P1 — 高光馆 (highlights) + 一技封神 (skills) + 感谢信漂流 (gratitude)
 *
 * 设计原则：
 *   - 每个 feature 独立一个 schema 文件,便于 grep / 维护
 *   - 状态机统一为 pending / approved / rejected,跟 review 状态机对齐
 *     (spec 03 §2 风格)
 *   - 高光馆不新建"内容"表 — spec 写明复用 users.highlightMoment +
 *     users.profileFieldsStatus。这里只建 highlights 提交历史 / 审核队列
 *     的轻量表,给 /api/highlights POST 用。approved 后由审核员决定是否
 *     写回用户的 highlightMoment 字段(profileFieldsStatus 联动)。
 */
import {
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

export const highlightStatusEnum = pgEnum("highlight_status", [
  "pending",
  "approved",
  "rejected",
])

export const highlights = pgTable(
  "highlights",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    status: highlightStatusEnum("status").default("pending").notNull(),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("highlights_status_created_at_idx").on(table.status, table.createdAt),
    index("highlights_user_idx").on(table.userId),
  ]
)

// ----- 一技封神 -----

export const skillStatusEnum = pgEnum("skill_status", [
  "pending",
  "approved",
  "rejected",
])

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    description: text("description").notNull(),
    evidenceNote: text("evidence_note").notNull(),
    endorserCount: integer("endorser_count").default(0).notNull(),
    status: skillStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("skills_status_endorser_count_idx").on(
      table.status,
      table.endorserCount
    ),
    index("skills_user_idx").on(table.userId),
  ]
)

export const skillEndorsements = pgTable(
  "skill_endorsements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    endorserUserId: uuid("endorser_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("skill_endorsements_skill_user_unique").on(
      table.skillId,
      table.endorserUserId
    ),
    index("skill_endorsements_skill_idx").on(table.skillId),
  ]
)

// ----- 感谢信漂流 -----
// 不要审核,但要封顶:每 12 小时周期内,fromUser 最多给 toUser 写 1 封。

export const gratitude = pgTable(
  "gratitude",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    isAnonymous: text("is_anonymous").default("false").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("gratitude_to_created_at_idx").on(table.toUserId, table.createdAt),
    index("gratitude_from_created_at_idx").on(
      table.fromUserId,
      table.createdAt
    ),
  ]
)
/**
 * M3 私聊 (direct message) schema
 *
 * Per docs/04-spec-f3-growth.md §3:
 *   - dm_threads: id, participantAId, participantBId, lastMessageAt, createdAt
 *     唯一索引 (LEAST(A,B), GREATEST(A,B)) 保证两个用户之间只有一个 thread
 *   - dm_messages: id, threadId (FK), senderId, content, createdAt
 *   - dm_requests: id, fromUserId, toUserId, introText (140 字限),
 *     status (pending/accepted/rejected/withdrawn), createdAt, actionedAt
 *
 * Spec: 段位差 = |fromUser.trustLevel - toUser.trustLevel|;
 * 差 ≥ 2 → 走请求队列; ≤ 1 → 直接开 thread。
 *
 * 端到端加密: schema 留 encryptionVersion 字段默认 'none' (per spec, M3.1+ 才实现)。
 *
 * 注: drizzle 0.45 不直接支持 LEAST/GREATEST 表达式唯一索引; 服务层用 (lo, hi)
 * ordering 强制, schema 仅建普通索引。
 */
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { users } from "./users"

export const dmRequestStatusEnum = pgEnum("dm_request_status", [
  "pending",
  "accepted",
  "rejected",
  "withdrawn",
])

export const dmThreads = pgTable(
  "dm_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    participantAId: uuid("participant_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    participantBId: uuid("participant_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    encryptionVersion: text("encryption_version")
      .default("none")
      .notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("dm_threads_participant_a_idx").on(table.participantAId),
    index("dm_threads_participant_b_idx").on(table.participantBId),
    index("dm_threads_last_message_idx").on(table.lastMessageAt),
  ]
)

export const dmMessages = pgTable(
  "dm_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => dmThreads.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("dm_messages_thread_idx").on(table.threadId, table.createdAt),
    index("dm_messages_sender_idx").on(table.senderId),
  ]
)

export const dmRequests = pgTable(
  "dm_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    introText: text("intro_text").notNull(),
    status: dmRequestStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    actionedAt: timestamp("actioned_at", { withTimezone: true }),
    rejectReason: text("reject_reason"),
  },
  (table) => [
    index("dm_requests_to_status_idx").on(table.toUserId, table.status),
    index("dm_requests_from_status_idx").on(table.fromUserId, table.status),
    index("dm_requests_created_idx").on(table.createdAt),
  ]
)

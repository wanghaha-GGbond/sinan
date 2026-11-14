import { pgTable, uuid, text, timestamp, primaryKey, index, uniqueIndex, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

export const forumPosts = pgTable("forum_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").notNull().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  authorUserId: uuid("author_user_id").references(() => users.id),
  category: text("category").notNull(), title: text("title").notNull(), content: text("content").notNull(),
  status: text("status").notNull().default("pending_review"),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, t => [
  check("forum_post_category", sql`${t.category} IN ('question','experience','interview','career')`),
  check("forum_post_status", sql`${t.status} IN ('pending_review','visible','hidden','rejected','deleted')`),
  check("forum_post_length", sql`char_length(btrim(${t.title})) BETWEEN 4 AND 100 AND char_length(btrim(${t.content})) BETWEEN 10 AND 3000`),
  index("forum_post_feed_idx").on(t.status, t.createdAt, t.id).where(sql`${t.deletedAt} IS NULL`),
  index("forum_post_company_idx").on(t.companyId, t.status, t.createdAt, t.id).where(sql`${t.deletedAt} IS NULL`),
  index("forum_post_author_idx").on(t.authorUserId, t.createdAt),
  uniqueIndex("forum_post_request_idx").on(t.authorUserId, t.requestId),
])
export const forumReplies = pgTable("forum_replies", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").notNull().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => forumPosts.id, { onDelete: "cascade" }),
  authorUserId: uuid("author_user_id").references(() => users.id),
  content: text("content").notNull(), status: text("status").notNull().default("pending_review"),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, t => [
  check("forum_reply_status", sql`${t.status} IN ('pending_review','visible','hidden','rejected','deleted')`),
  check("forum_reply_length", sql`char_length(btrim(${t.content})) BETWEEN 2 AND 1000`),
  index("forum_reply_post_idx").on(t.postId, t.status, t.createdAt, t.id).where(sql`${t.deletedAt} IS NULL`),
  index("forum_reply_author_idx").on(t.authorUserId),
  uniqueIndex("forum_reply_request_idx").on(t.authorUserId, t.requestId),
])
export const forumVotes = pgTable("forum_votes", {
  postId: uuid("post_id").notNull().references(() => forumPosts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, t => [primaryKey({ columns: [t.postId, t.userId] }), index("forum_vote_user_idx").on(t.userId)])
export const forumFollows = pgTable("forum_follows", {
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, t => [primaryKey({ columns: [t.userId, t.companyId] })])
export const forumReports = pgTable("forum_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => forumPosts.id, { onDelete: "cascade" }),
  replyId: uuid("reply_id").references(() => forumReplies.id, { onDelete: "cascade" }),
  reporterUserId: uuid("reporter_user_id").references(() => users.id),
  targetKey: text("target_key").notNull(), reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, t => [
  uniqueIndex("forum_report_dedupe").on(t.reporterUserId, t.targetKey),
  check("forum_report_reason", sql`${t.reason} IN ('privacy','attack','spam','other')`),
  check("forum_report_target", sql`(${t.replyId} IS NULL AND ${t.targetKey} = 'post:' || ${t.postId}::text) OR (${t.replyId} IS NOT NULL AND ${t.targetKey} = 'reply:' || ${t.replyId}::text)`),
  index("forum_report_queue_idx").on(t.createdAt).where(sql`${t.resolvedAt} IS NULL`),
])
export const forumModerationEvents = pgTable("forum_moderation_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => forumPosts.id, { onDelete: "cascade" }),
  replyId: uuid("reply_id").references(() => forumReplies.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  fromStatus: text("from_status").notNull(), toStatus: text("to_status").notNull(), reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("forum_event_post_idx").on(t.postId, t.createdAt)])

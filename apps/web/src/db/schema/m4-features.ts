/**
 * M3 — 新闻匿名批注 + M4 — 积分竞猜 / 雇主品牌体检报告
 *
 * 重要红线(08 §3):
 *   - news_articles 只存公开来源 (RSS / 公司新闻发布) 数据,不存个人数据
 *   - employer_reports.content 必须是聚合洞察(数值 / 百分比 / 列表),
 *     禁止任何 reviewer 引用 / 单条 review 内容
 *   - prediction_markets 是"积分竞猜"骨架,不接真钱
 */
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { users } from "./users"
import { companies } from "./companies"

// ----- 新闻匿名批注 -----

export const newsAnnotationStatusEnum = pgEnum("news_annotation_status", [
  "visible",
  "hidden",
])

export const newsArticles = pgTable(
  "news_articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceUrl: text("source_url").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    // 来源标识 (e.g. "rss:36kr", "press:bytedance")
    sourceKind: text("source_kind").default("press").notNull(),
    // 公开文章里提到的公司 slug 列表(脱敏聚合用)
    companyMentions: jsonb("company_mentions").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("news_articles_source_url_unique").on(table.sourceUrl),
    index("news_articles_published_at_idx").on(table.publishedAt),
  ]
)

export const newsAnnotations = pgTable(
  "news_annotations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => newsArticles.id, { onDelete: "cascade" }),
    annotatorUserId: uuid("annotator_user_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    status: newsAnnotationStatusEnum("status").default("visible").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("news_annotations_article_idx").on(table.articleId),
    index("news_annotations_status_idx").on(table.status),
  ]
)

// ----- 积分竞猜 (M4 探索期,不接真钱) -----

export const predictionStatusEnum = pgEnum("prediction_status", [
  "open",
  "closed",
  "resolved",
])

export const predictionMarkets = pgTable(
  "prediction_markets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: predictionStatusEnum("status").default("open").notNull(),
    // outcomes: e.g. ["yes", "no"] 或 ["a", "b", "c"]
    outcomes: jsonb("outcomes").$type<string[]>().notNull(),
    // resolved 时指向 outcomes 数组的下标;null 表示未结算
    resolvedOutcome: integer("resolved_outcome"),
    closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
    resolvesAt: timestamp("resolves_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("prediction_markets_status_idx").on(table.status),
    index("prediction_markets_closes_at_idx").on(table.closesAt),
  ]
)

export const predictionBets = pgTable(
  "prediction_bets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    marketId: uuid("market_id")
      .notNull()
      .references(() => predictionMarkets.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    outcome: text("outcome").notNull(),
    pointsBet: integer("points_bet").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("prediction_bets_market_idx").on(table.marketId),
    index("prediction_bets_user_idx").on(table.userId),
  ]
)

// ----- 雇主品牌体检报告 (M4 B 端探索) -----

export const employerReportStatusEnum = pgEnum("employer_report_status", [
  "draft",
  "paid",
  "generated",
  "delivered",
])

export const employerReports = pgTable(
  "employer_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    // e.g. "2026-05" / "2026-Q2"
    reportPeriod: text("report_period").notNull(),
    // 聚合洞察:只能是数值 / 百分比 / 列表,严禁存单条 review 内容
    // schema 类型用 unknown 强制上层做类型断言 — schema 层不背书结构
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    priceCents: integer("price_cents").default(0).notNull(),
    status: employerReportStatusEnum("status").default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (table) => [
    index("employer_reports_company_idx").on(table.companyId),
    index("employer_reports_status_idx").on(table.status),
    uniqueIndex("employer_reports_company_period_unique").on(
      table.companyId,
      table.reportPeriod
    ),
  ]
)
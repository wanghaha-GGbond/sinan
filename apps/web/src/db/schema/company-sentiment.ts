import { date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

import { companies } from "./companies"
import { users } from "./users"

export const companySentimentDaily = pgTable(
  "company_sentiment_daily",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    date: date("date").notNull(),
    score: numeric("score", { precision: 4, scale: 1 }).notNull(),
    sampleCount: integer("sample_count").default(0).notNull(),
    components: jsonb("components").$type<Record<string, number>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("company_sentiment_company_date_unique").on(table.companyId, table.date),
    index("company_sentiment_date_idx").on(table.date),
  ]
)

export const companyEvents = pgTable(
  "company_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    eventDate: date("event_date").notNull(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    sourceUrl: text("source_url"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("company_events_company_date_idx").on(table.companyId, table.eventDate)]
)

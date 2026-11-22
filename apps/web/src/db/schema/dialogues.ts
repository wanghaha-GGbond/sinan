import { sql } from "drizzle-orm"
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { users } from "./users"
import { companies } from "./companies"

export const dialogueSessions = pgTable("dialogue_sessions", {
  id: uuid("id").defaultRandom().primaryKey(), createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  requestId: uuid("request_id").notNull(),
  title: text("title").notNull(), description: text("description").notNull(), guestName: text("guest_name").notNull(), guestBio: text("guest_bio").notNull(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  durationMinutes: integer("duration_minutes").notNull(), capacity: integer("capacity").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(), signupEndsAt: timestamp("signup_ends_at", { withTimezone: true }).notNull(),
  fundingMode: text("funding_mode").notNull().default("undecided"), status: text("status").notNull().default("draft"),
  guestConsentConfirmed: boolean("guest_consent_confirmed").notNull().default(false),
  recap: text("recap").notNull().default(""), recapConsentConfirmed: boolean("recap_consent_confirmed").notNull().default(false),
  privateInstructions: text("private_instructions").notNull().default(""), cancelReason: text("cancel_reason"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  check("dialogue_session_status", sql`${t.status} IN ('draft','open','closed','completed','cancelled','hidden')`),
  check("dialogue_funding_plan", sql`${t.fundingMode} IN ('undecided','all_donated','host_and_donation')`),
  check("dialogue_schedule", sql`${t.signupEndsAt} < ${t.startsAt} AND ${t.durationMinutes} BETWEEN 15 AND 120 AND ${t.capacity} BETWEEN 1 AND 20`),
  check("dialogue_guest_consent", sql`${t.status} NOT IN ('open','closed','completed') OR (${t.guestConsentConfirmed} AND ${t.publishedAt} IS NOT NULL)`),
  check("dialogue_recap_consent", sql`${t.recap} = '' OR ${t.recapConsentConfirmed}`),
  index("dialogue_public_idx").on(t.status, t.createdAt, t.id), index("dialogue_company_idx").on(t.companyId, t.createdAt),
  uniqueIndex("dialogue_session_request").on(t.createdBy, t.requestId),
])
export const dialogueApplications = pgTable("dialogue_applications", {
  id: uuid("id").defaultRandom().primaryKey(), sessionId: uuid("session_id").notNull().references(() => dialogueSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), requestId: uuid("request_id").notNull(),
  question: text("question").notNull(), status: text("status").notNull().default("submitted"), decisionNote: text("decision_note"),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex("dialogue_application_person").on(t.sessionId, t.userId),
  index("dialogue_application_queue").on(t.sessionId, t.createdAt, t.id), index("dialogue_application_owner").on(t.userId, t.createdAt, t.id),
  check("dialogue_application_status", sql`${t.status} IN ('submitted','selected','not_selected','withdrawn')`),
  check("dialogue_application_question", sql`(${t.status} = 'withdrawn' AND ${t.question} = '') OR (${t.status} <> 'withdrawn' AND char_length(btrim(${t.question})) BETWEEN 10 AND 800)`),
])
export const dialogueAuditEvents = pgTable("dialogue_audit_events", {
  id: uuid("id").defaultRandom().primaryKey(), sessionId: uuid("session_id").notNull().references(() => dialogueSessions.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  applicationId: uuid("application_id").references(() => dialogueApplications.id, { onDelete: "set null" }),
  action: text("action").notNull(), fromStatus: text("from_status"), toStatus: text("to_status"), reason: text("reason").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("dialogue_audit_session").on(t.sessionId, t.createdAt)])

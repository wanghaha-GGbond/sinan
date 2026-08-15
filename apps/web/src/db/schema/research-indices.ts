import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { companies } from "./companies"
import { users } from "./users"

export const researchEvidence = pgTable(
  "research_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    indexKey: text("index_key").notNull(),
    scopeType: text("scope_type").default("company").notNull(),
    scopeKey: text("scope_key").default("company").notNull(),
    departmentName: text("department_name"),
    city: text("city"),
    jobFamily: text("job_family"),
    sourceKind: text("source_kind").notNull(),
    sourceType: text("source_type").notNull(),
    sourceUrl: text("source_url"),
    title: text("title"),
    excerpt: text("excerpt"),
    effect: numeric("effect", { precision: 5, scale: 4 }).notNull(),
    sourceWeight: numeric("source_weight", { precision: 5, scale: 4 }).notNull(),
    freshnessWeight: numeric("freshness_weight", { precision: 5, scale: 4 }).notNull(),
    relevanceWeight: numeric("relevance_weight", { precision: 5, scale: 4 }).notNull(),
    trustWeight: numeric("trust_weight", { precision: 5, scale: 4 }).notNull(),
    evidenceHash: text("evidence_hash").notNull(),
    clusterKey: text("cluster_key").notNull(),
    publishedAt: date("published_at"),
    collectedAt: timestamp("collected_at", { withTimezone: true }),
    reviewStatus: text("review_status").default("pending").notNull(),
    rawJson: jsonb("raw_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("research_evidence_company_hash_unique").on(table.companyId, table.indexKey, table.evidenceHash, table.scopeKey),
    index("research_evidence_company_index_idx").on(table.companyId, table.indexKey, table.reviewStatus),
    index("research_evidence_cluster_idx").on(table.companyId, table.indexKey, table.clusterKey),
  ]
)

export const researchIndexRuns = pgTable(
  "index_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fingerprint: text("fingerprint").notNull().unique(),
    modelVersion: text("model_version").notNull(),
    status: text("status").default("candidate").notNull(),
    dataAsOf: date("data_as_of").notNull(),
    sourceCounts: jsonb("source_counts").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("index_runs_status_idx").on(table.status, table.generatedAt)]
)

export const companyIndexScores = pgTable(
  "company_index_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id").notNull().references(() => researchIndexRuns.id),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    indexKey: text("index_key").notNull(),
    indexGroup: text("index_group").notNull(),
    scopeType: text("scope_type").default("company").notNull(),
    scopeKey: text("scope_key").default("company").notNull(),
    scopeId: text("scope_id"),
    rawScore: numeric("raw_score", { precision: 5, scale: 1 }).notNull(),
    score: numeric("score", { precision: 5, scale: 1 }),
    confidence: numeric("confidence", { precision: 5, scale: 1 }).notNull(),
    effectiveSampleSize: numeric("effective_sample_size", { precision: 8, scale: 2 }).default("0").notNull(),
    sourceCount: integer("source_count").default(0).notNull(),
    evidenceCount: integer("evidence_count").default(0).notNull(),
    reasons: jsonb("reasons").notNull(),
    limitations: jsonb("limitations").notNull(),
    evidenceRefs: jsonb("evidence_refs").notNull(),
    publishStatus: text("publish_status").default("candidate").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("company_index_scores_run_scope_key_unique").on(table.runId, table.companyId, table.scopeType, table.scopeKey, table.indexKey),
    index("company_index_scores_published_idx").on(table.companyId, table.publishStatus, table.indexKey),
    index("company_index_scores_run_idx").on(table.runId, table.companyId),
  ]
)

export const companyIndexEvidenceLinks = pgTable(
  "company_index_evidence_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scoreId: uuid("score_id").notNull().references(() => companyIndexScores.id),
    evidenceId: uuid("evidence_id").notNull().references(() => researchEvidence.id),
    effect: numeric("effect", { precision: 5, scale: 4 }).notNull(),
    weight: numeric("weight", { precision: 8, scale: 4 }).notNull(),
    contribution: numeric("contribution", { precision: 8, scale: 4 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("company_index_evidence_links_score_evidence_unique").on(table.scoreId, table.evidenceId),
    index("company_index_evidence_links_evidence_idx").on(table.evidenceId),
  ]
)

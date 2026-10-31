CREATE TABLE "research_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "index_key" text NOT NULL,
  "scope_type" text DEFAULT 'company' NOT NULL,
  "scope_key" text DEFAULT 'company' NOT NULL,
  "department_name" text,
  "city" text,
  "job_family" text,
  "source_kind" text NOT NULL,
  "source_type" text NOT NULL,
  "source_url" text,
  "title" text,
  "excerpt" text,
  "effect" numeric(5,4) NOT NULL CHECK ("effect" >= -1 AND "effect" <= 1),
  "source_weight" numeric(5,4) NOT NULL CHECK ("source_weight" >= 0 AND "source_weight" <= 1),
  "freshness_weight" numeric(5,4) NOT NULL CHECK ("freshness_weight" >= 0 AND "freshness_weight" <= 1),
  "relevance_weight" numeric(5,4) NOT NULL CHECK ("relevance_weight" >= 0 AND "relevance_weight" <= 1),
  "trust_weight" numeric(5,4) NOT NULL CHECK ("trust_weight" >= 0 AND "trust_weight" <= 1),
  "evidence_hash" text NOT NULL,
  "cluster_key" text NOT NULL,
  "published_at" date,
  "collected_at" timestamp with time zone,
  "review_status" text DEFAULT 'pending' NOT NULL CHECK ("review_status" IN ('pending', 'approved', 'rejected')),
  "raw_json" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "index_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "fingerprint" text NOT NULL UNIQUE,
  "model_version" text NOT NULL,
  "status" text DEFAULT 'candidate' NOT NULL CHECK ("status" IN ('candidate', 'pending_review', 'published', 'superseded', 'rejected')),
  "data_as_of" date NOT NULL,
  "source_counts" jsonb NOT NULL,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reviewed_at" timestamp with time zone,
  "reviewed_by_user_id" uuid,
  "review_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "company_index_scores" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "run_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "index_key" text NOT NULL,
  "index_group" text NOT NULL CHECK ("index_group" IN ('overall', 'core', 'fun')),
  "scope_type" text DEFAULT 'company' NOT NULL,
  "scope_key" text DEFAULT 'company' NOT NULL,
  "scope_id" text,
  "raw_score" numeric(5,1) NOT NULL CHECK ("raw_score" >= 0 AND "raw_score" <= 100),
  "score" numeric(5,1) CHECK ("score" >= 0 AND "score" <= 100),
  "confidence" numeric(5,1) NOT NULL CHECK ("confidence" >= 0 AND "confidence" <= 100),
  "effective_sample_size" numeric(8,2) DEFAULT 0 NOT NULL,
  "source_count" integer DEFAULT 0 NOT NULL,
  "evidence_count" integer DEFAULT 0 NOT NULL,
  "reasons" jsonb NOT NULL,
  "limitations" jsonb NOT NULL,
  "evidence_refs" jsonb NOT NULL,
  "publish_status" text DEFAULT 'candidate' NOT NULL CHECK ("publish_status" IN ('candidate', 'published', 'superseded', 'rejected')),
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "company_index_evidence_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "score_id" uuid NOT NULL,
  "evidence_id" uuid NOT NULL,
  "effect" numeric(5,4) NOT NULL,
  "weight" numeric(8,4) NOT NULL,
  "contribution" numeric(8,4) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "research_evidence" ADD CONSTRAINT "research_evidence_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "index_runs" ADD CONSTRAINT "index_runs_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id");--> statement-breakpoint
ALTER TABLE "company_index_scores" ADD CONSTRAINT "company_index_scores_run_id_index_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."index_runs"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "company_index_scores" ADD CONSTRAINT "company_index_scores_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "company_index_evidence_links" ADD CONSTRAINT "company_index_evidence_links_score_id_company_index_scores_id_fk" FOREIGN KEY ("score_id") REFERENCES "public"."company_index_scores"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "company_index_evidence_links" ADD CONSTRAINT "company_index_evidence_links_evidence_id_research_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."research_evidence"("id") ON DELETE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "research_evidence_company_hash_unique" ON "research_evidence" ("company_id","index_key","evidence_hash","scope_key");--> statement-breakpoint
CREATE INDEX "research_evidence_company_index_idx" ON "research_evidence" ("company_id","index_key","review_status");--> statement-breakpoint
CREATE INDEX "research_evidence_cluster_idx" ON "research_evidence" ("company_id","index_key","cluster_key");--> statement-breakpoint
CREATE INDEX "index_runs_status_idx" ON "index_runs" ("status","generated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "company_index_scores_run_scope_key_unique" ON "company_index_scores" ("run_id","company_id","scope_type","scope_key","index_key");--> statement-breakpoint
CREATE INDEX "company_index_scores_published_idx" ON "company_index_scores" ("company_id","publish_status","index_key");--> statement-breakpoint
CREATE INDEX "company_index_scores_run_idx" ON "company_index_scores" ("run_id","company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_index_evidence_links_score_evidence_unique" ON "company_index_evidence_links" ("score_id","evidence_id");--> statement-breakpoint
CREATE INDEX "company_index_evidence_links_evidence_idx" ON "company_index_evidence_links" ("evidence_id");

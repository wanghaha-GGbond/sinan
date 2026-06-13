CREATE TYPE "public"."promise_outcome_status" AS ENUM('kept', 'partial', 'broken');--> statement-breakpoint
CREATE TYPE "public"."promise_record_status" AS ENUM('pending_review', 'visible', 'rejected', 'hidden');--> statement-breakpoint
CREATE TABLE "promise_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "department_id" uuid,
  "author_user_id" uuid NOT NULL,
  "anonymous_profile_id" uuid,
  "promise_category" text NOT NULL,
  "promise_text" text NOT NULL,
  "promise_date" date NOT NULL,
  "outcome_text" text NOT NULL,
  "outcome_status" "promise_outcome_status" NOT NULL,
  "evidence_type" text NOT NULL,
  "evidence_fingerprint" text NOT NULL,
  "status" "promise_record_status" DEFAULT 'pending_review' NOT NULL,
  "moderation_reason" text,
  "reviewed_by_user_id" uuid,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE "moderation_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "actor_user_id" uuid,
  "actor_role" text NOT NULL,
  "from_status" text,
  "to_status" text NOT NULL,
  "reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "company_sentiment_daily" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "date" date NOT NULL,
  "score" numeric(4,1) NOT NULL,
  "sample_count" integer DEFAULT 0 NOT NULL,
  "components" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "company_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "event_date" date NOT NULL,
  "title" text NOT NULL,
  "category" text NOT NULL,
  "source_url" text,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "promise_records" ADD CONSTRAINT "promise_records_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");--> statement-breakpoint
ALTER TABLE "promise_records" ADD CONSTRAINT "promise_records_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");--> statement-breakpoint
ALTER TABLE "promise_records" ADD CONSTRAINT "promise_records_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id");--> statement-breakpoint
ALTER TABLE "promise_records" ADD CONSTRAINT "promise_records_anonymous_profile_id_anonymous_profiles_id_fk" FOREIGN KEY ("anonymous_profile_id") REFERENCES "public"."anonymous_profiles"("id");--> statement-breakpoint
ALTER TABLE "promise_records" ADD CONSTRAINT "promise_records_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id");--> statement-breakpoint
ALTER TABLE "moderation_events" ADD CONSTRAINT "moderation_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id");--> statement-breakpoint
ALTER TABLE "company_sentiment_daily" ADD CONSTRAINT "company_sentiment_daily_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");--> statement-breakpoint
ALTER TABLE "company_events" ADD CONSTRAINT "company_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");--> statement-breakpoint
ALTER TABLE "company_events" ADD CONSTRAINT "company_events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id");--> statement-breakpoint
CREATE INDEX "promise_records_company_public_idx" ON "promise_records" ("company_id","status","promise_date") WHERE "status" = 'visible' AND "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "promise_records_moderation_idx" ON "promise_records" ("status","created_at");--> statement-breakpoint
CREATE INDEX "promise_records_author_idx" ON "promise_records" ("author_user_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_events_entity_idx" ON "moderation_events" ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_events_actor_idx" ON "moderation_events" ("actor_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "company_sentiment_company_date_unique" ON "company_sentiment_daily" ("company_id","date");--> statement-breakpoint
CREATE INDEX "company_sentiment_date_idx" ON "company_sentiment_daily" ("date");--> statement-breakpoint
CREATE INDEX "company_events_company_date_idx" ON "company_events" ("company_id","event_date");

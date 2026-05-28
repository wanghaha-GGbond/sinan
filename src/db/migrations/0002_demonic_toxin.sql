CREATE TYPE "public"."review_author_role" AS ENUM('job_seeker', 'current_employee', 'former_employee', 'interviewee', 'intern', 'contractor', 'anonymous');--> statement-breakpoint
CREATE TYPE "public"."review_moderation_reason" AS ENUM('sensitive_info', 'personal_attack', 'privacy', 'spam', 'off_topic', 'duplicate', 'author_deleted', 'none');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('draft', 'pending_review', 'visible', 'limited_visible', 'hidden', 'rejected', 'deleted_by_author');--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"author_user_id" uuid,
	"anonymous_profile_id" uuid,
	"author_fingerprint_hash" text,
	"author_role" "review_author_role" DEFAULT 'anonymous' NOT NULL,
	"author_label" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"direction_score" numeric(3, 1) NOT NULL,
	"recommend_to_join" boolean,
	"employment_status" text,
	"job_title" text,
	"city" text,
	"department_hint" text,
	"questionnaire" jsonb,
	"office_experience_score" numeric(3, 1),
	"useful_count" integer DEFAULT 0 NOT NULL,
	"discussion_count" integer DEFAULT 0 NOT NULL,
	"status" "review_status" DEFAULT 'pending_review' NOT NULL,
	"moderation_reason" "review_moderation_reason",
	"masked_content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_anonymous_profile_id_anonymous_profiles_id_fk" FOREIGN KEY ("anonymous_profile_id") REFERENCES "public"."anonymous_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_company_visible_idx" ON "reviews" USING btree ("company_id","status","created_at") WHERE "reviews"."status" IN ('visible', 'limited_visible') AND "reviews"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "reviews_company_useful_idx" ON "reviews" USING btree ("company_id","useful_count") WHERE "reviews"."status" IN ('visible', 'limited_visible') AND "reviews"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "reviews_author_user_idx" ON "reviews" USING btree ("author_user_id","created_at") WHERE "reviews"."author_user_id" IS NOT NULL AND "reviews"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "reviews_anonymous_profile_idx" ON "reviews" USING btree ("anonymous_profile_id","created_at") WHERE "reviews"."anonymous_profile_id" IS NOT NULL AND "reviews"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status","created_at") WHERE "reviews"."deleted_at" IS NULL;
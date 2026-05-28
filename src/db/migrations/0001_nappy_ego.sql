CREATE TYPE "public"."company_claimed_status" AS ENUM('unclaimed', 'claimed');--> statement-breakpoint
CREATE TYPE "public"."company_review_status" AS ENUM('pending_review', 'reviewable', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."company_source" AS ENUM('platform_seed', 'user_added', 'platform_verified', 'import');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"registered_name" text,
	"short_name" text,
	"english_name" text,
	"aliases" text[],
	"unified_social_credit_code" text,
	"registered_address" text,
	"legal_representative" text,
	"business_status" text,
	"founded_date" date,
	"city" text NOT NULL,
	"industry" text NOT NULL,
	"size" text,
	"financing_stage" text,
	"website" text,
	"logo_url" text,
	"description" text,
	"source" "company_source" DEFAULT 'user_added' NOT NULL,
	"review_status" "company_review_status" DEFAULT 'pending_review' NOT NULL,
	"claimed_status" "company_claimed_status" DEFAULT 'unclaimed' NOT NULL,
	"submitted_by_user_id" uuid,
	"submitted_by_anonymous_profile_id" uuid,
	"verified_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_submitted_by_anonymous_profile_id_anonymous_profiles_id_fk" FOREIGN KEY ("submitted_by_anonymous_profile_id") REFERENCES "public"."anonymous_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_credit_code_unique" ON "companies" USING btree ("unified_social_credit_code") WHERE "companies"."unified_social_credit_code" IS NOT NULL AND "companies"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_registered_name_unique" ON "companies" USING btree ("registered_name") WHERE "companies"."registered_name" IS NOT NULL AND "companies"."review_status" != 'rejected' AND "companies"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "companies_review_status_idx" ON "companies" USING btree ("review_status","created_at");--> statement-breakpoint
CREATE INDEX "companies_city_industry_idx" ON "companies" USING btree ("city","industry");--> statement-breakpoint
CREATE INDEX "companies_name_idx" ON "companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "companies_registered_name_idx" ON "companies" USING btree ("registered_name");--> statement-breakpoint
CREATE INDEX "companies_submitted_by_user_idx" ON "companies" USING btree ("submitted_by_user_id","created_at");--> statement-breakpoint
CREATE INDEX "companies_submitted_by_anon_idx" ON "companies" USING btree ("submitted_by_anonymous_profile_id","created_at");
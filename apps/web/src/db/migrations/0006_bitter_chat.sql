CREATE TYPE "public"."company_appeal_reason" AS ENUM('personal_attack', 'dox_leader', 'fake_fact', 'rumor', 'ai_spam', 'competitor', 'other');--> statement-breakpoint
CREATE TYPE "public"."company_appeal_status" AS ENUM('submitted', 'reviewing', 'upheld', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."company_correction_field" AS ENUM('name', 'registeredName', 'industry', 'city', 'size', 'stage', 'description', 'website', 'other');--> statement-breakpoint
CREATE TYPE "public"."company_correction_status" AS ENUM('submitted', 'reviewing', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "company_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"submitter_user_id" uuid,
	"submitter_anonymous_profile_id" uuid,
	"submitter_fingerprint_hash" text,
	"contact_email" text,
	"field" "company_correction_field" NOT NULL,
	"current_value" text NOT NULL,
	"proposed_value" text NOT NULL,
	"reason" text,
	"status" "company_correction_status" DEFAULT 'submitted' NOT NULL,
	"moderator_user_id" uuid,
	"moderation_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actioned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "company_appeals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"review_id" uuid NOT NULL,
	"submitter_user_id" uuid,
	"submitter_anonymous_profile_id" uuid,
	"submitter_fingerprint_hash" text,
	"contact_email" text,
	"reason" "company_appeal_reason" NOT NULL,
	"note" text,
	"status" "company_appeal_status" DEFAULT 'submitted' NOT NULL,
	"moderator_user_id" uuid,
	"moderation_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actioned_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "company_corrections" ADD CONSTRAINT "company_corrections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_corrections" ADD CONSTRAINT "company_corrections_submitter_user_id_users_id_fk" FOREIGN KEY ("submitter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_corrections" ADD CONSTRAINT "company_corrections_submitter_anonymous_profile_id_anonymous_profiles_id_fk" FOREIGN KEY ("submitter_anonymous_profile_id") REFERENCES "public"."anonymous_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_corrections" ADD CONSTRAINT "company_corrections_moderator_user_id_users_id_fk" FOREIGN KEY ("moderator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_appeals" ADD CONSTRAINT "company_appeals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_appeals" ADD CONSTRAINT "company_appeals_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_appeals" ADD CONSTRAINT "company_appeals_submitter_user_id_users_id_fk" FOREIGN KEY ("submitter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_appeals" ADD CONSTRAINT "company_appeals_submitter_anonymous_profile_id_anonymous_profiles_id_fk" FOREIGN KEY ("submitter_anonymous_profile_id") REFERENCES "public"."anonymous_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_appeals" ADD CONSTRAINT "company_appeals_moderator_user_id_users_id_fk" FOREIGN KEY ("moderator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_corrections_submitter_field_unique" ON "company_corrections" USING btree ("submitter_user_id","company_id","field") WHERE "company_corrections"."submitter_user_id" IS NOT NULL AND "company_corrections"."status" IN ('submitted', 'reviewing');--> statement-breakpoint
CREATE INDEX "company_corrections_company_idx" ON "company_corrections" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "company_corrections_status_idx" ON "company_corrections" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "company_corrections_moderator_idx" ON "company_corrections" USING btree ("moderator_user_id","actioned_at");--> statement-breakpoint
CREATE INDEX "company_appeals_company_idx" ON "company_appeals" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "company_appeals_review_idx" ON "company_appeals" USING btree ("review_id","created_at");--> statement-breakpoint
CREATE INDEX "company_appeals_status_idx" ON "company_appeals" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "company_appeals_moderator_idx" ON "company_appeals" USING btree ("moderator_user_id","actioned_at");
CREATE TYPE "public"."review_report_reason" AS ENUM('personal_attack', 'privacy', 'rumor', 'mob', 'leader_dox', 'ai_spam', 'competitor', 'company_astro', 'duplicate', 'other');--> statement-breakpoint
CREATE TYPE "public"."review_report_status" AS ENUM('open', 'reviewing', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TABLE "review_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"reporter_user_id" uuid,
	"reporter_anonymous_profile_id" uuid,
	"reporter_fingerprint_hash" text,
	"reason" "review_report_reason" NOT NULL,
	"note" text,
	"status" "review_report_status" DEFAULT 'open' NOT NULL,
	"moderator_user_id" uuid,
	"moderation_note" text,
	"action_taken" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actioned_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reporter_anonymous_profile_id_anonymous_profiles_id_fk" FOREIGN KEY ("reporter_anonymous_profile_id") REFERENCES "public"."anonymous_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_moderator_user_id_users_id_fk" FOREIGN KEY ("moderator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "review_reports_reporter_review_unique" ON "review_reports" USING btree ("reporter_user_id","review_id") WHERE "review_reports"."reporter_user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "review_reports_review_idx" ON "review_reports" USING btree ("review_id","created_at");--> statement-breakpoint
CREATE INDEX "review_reports_company_idx" ON "review_reports" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "review_reports_status_idx" ON "review_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "review_reports_moderator_idx" ON "review_reports" USING btree ("moderator_user_id","actioned_at");
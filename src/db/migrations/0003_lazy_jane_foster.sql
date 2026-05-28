CREATE TYPE "public"."review_discussion_moderation_reason" AS ENUM('sensitive_info', 'personal_attack', 'privacy', 'spam', 'off_topic', 'duplicate', 'author_deleted', 'none');--> statement-breakpoint
CREATE TYPE "public"."review_discussion_status" AS ENUM('draft', 'local_pending', 'pending_review', 'visible', 'limited_visible', 'hidden', 'rejected', 'deleted_by_author');--> statement-breakpoint
CREATE TYPE "public"."review_discussion_type" AS ENUM('question', 'supplement');--> statement-breakpoint
CREATE TABLE "review_discussions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"author_user_id" uuid,
	"anonymous_profile_id" uuid,
	"author_fingerprint_hash" text,
	"type" "review_discussion_type" NOT NULL,
	"author_role" "review_author_role" DEFAULT 'anonymous' NOT NULL,
	"author_label" text NOT NULL,
	"content" text NOT NULL,
	"masked_content" text,
	"status" "review_discussion_status" DEFAULT 'pending_review' NOT NULL,
	"moderation_reason" "review_discussion_moderation_reason",
	"useful_count" integer DEFAULT 0 NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"tags" text[],
	"source" text DEFAULT 'api' NOT NULL,
	"created_by_current_user" boolean,
	"pending_sync" boolean DEFAULT false NOT NULL,
	"visible_to_author" boolean DEFAULT true NOT NULL,
	"visible_to_public" boolean DEFAULT false NOT NULL,
	"participates_in_ranking" boolean DEFAULT false NOT NULL,
	"score" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "discussion_useful_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discussion_id" uuid NOT NULL,
	"user_id" uuid,
	"anonymous_profile_id" uuid,
	"voter_fingerprint_hash" text,
	"useful" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "review_discussions" ADD CONSTRAINT "review_discussions_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_discussions" ADD CONSTRAINT "review_discussions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_discussions" ADD CONSTRAINT "review_discussions_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_discussions" ADD CONSTRAINT "review_discussions_anonymous_profile_id_anonymous_profiles_id_fk" FOREIGN KEY ("anonymous_profile_id") REFERENCES "public"."anonymous_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_useful_votes" ADD CONSTRAINT "discussion_useful_votes_discussion_id_review_discussions_id_fk" FOREIGN KEY ("discussion_id") REFERENCES "public"."review_discussions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_useful_votes" ADD CONSTRAINT "discussion_useful_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_useful_votes" ADD CONSTRAINT "discussion_useful_votes_anonymous_profile_id_anonymous_profiles_id_fk" FOREIGN KEY ("anonymous_profile_id") REFERENCES "public"."anonymous_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_discussions_review_public_idx" ON "review_discussions" USING btree ("review_id","status","created_at") WHERE "review_discussions"."status" IN ('visible', 'limited_visible') AND "review_discussions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "review_discussions_review_useful_idx" ON "review_discussions" USING btree ("review_id","useful_count") WHERE "review_discussions"."status" IN ('visible', 'limited_visible') AND "review_discussions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "review_discussions_company_idx" ON "review_discussions" USING btree ("company_id","created_at") WHERE "review_discussions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "review_discussions_author_user_idx" ON "review_discussions" USING btree ("author_user_id","created_at") WHERE "review_discussions"."author_user_id" IS NOT NULL AND "review_discussions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "review_discussions_anonymous_profile_idx" ON "review_discussions" USING btree ("anonymous_profile_id","created_at") WHERE "review_discussions"."anonymous_profile_id" IS NOT NULL AND "review_discussions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "review_discussions_status_idx" ON "review_discussions" USING btree ("status","created_at") WHERE "review_discussions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "discussion_votes_user_unique" ON "discussion_useful_votes" USING btree ("discussion_id","user_id") WHERE "discussion_useful_votes"."user_id" IS NOT NULL AND "discussion_useful_votes"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "discussion_votes_anon_unique" ON "discussion_useful_votes" USING btree ("discussion_id","anonymous_profile_id") WHERE "discussion_useful_votes"."anonymous_profile_id" IS NOT NULL AND "discussion_useful_votes"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "discussion_votes_fingerprint_unique" ON "discussion_useful_votes" USING btree ("discussion_id","voter_fingerprint_hash") WHERE "discussion_useful_votes"."voter_fingerprint_hash" IS NOT NULL AND "discussion_useful_votes"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "discussion_votes_discussion_idx" ON "discussion_useful_votes" USING btree ("discussion_id");--> statement-breakpoint
CREATE INDEX "discussion_votes_user_idx" ON "discussion_useful_votes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "discussion_votes_anon_idx" ON "discussion_useful_votes" USING btree ("anonymous_profile_id","created_at");
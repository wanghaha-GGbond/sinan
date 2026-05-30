CREATE TYPE "public"."discussion_moderation_actor_role" AS ENUM('system', 'moderator', 'author');--> statement-breakpoint
CREATE TABLE "discussion_moderation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discussion_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"actor_role" "discussion_moderation_actor_role" NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"reason" text,
	"note" text,
	"raw_content_snapshot" text,
	"masked_content_snapshot" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discussion_moderation_events" ADD CONSTRAINT "discussion_moderation_events_discussion_id_review_discussions_id_fk" FOREIGN KEY ("discussion_id") REFERENCES "public"."review_discussions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_moderation_events" ADD CONSTRAINT "discussion_moderation_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_events_discussion_idx" ON "discussion_moderation_events" USING btree ("discussion_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_events_actor_idx" ON "discussion_moderation_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_events_to_status_idx" ON "discussion_moderation_events" USING btree ("to_status","created_at");
CREATE TABLE "review_author_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_user_id" uuid NOT NULL,
	"blocked_author_user_id" uuid,
	"blocked_anonymous_profile_id" uuid,
	"blocked_author_fingerprint_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_author_blocks_one_target_check" CHECK (
		("blocked_author_user_id" IS NOT NULL)::int +
		("blocked_anonymous_profile_id" IS NOT NULL)::int +
		("blocked_author_fingerprint_hash" IS NOT NULL)::int = 1
	)
);
--> statement-breakpoint
ALTER TABLE "review_author_blocks" ADD CONSTRAINT "review_author_blocks_blocker_user_id_users_id_fk" FOREIGN KEY ("blocker_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "review_author_blocks" ADD CONSTRAINT "review_author_blocks_blocked_author_user_id_users_id_fk" FOREIGN KEY ("blocked_author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "review_author_blocks" ADD CONSTRAINT "review_author_blocks_blocked_anonymous_profile_id_anonymous_profiles_id_fk" FOREIGN KEY ("blocked_anonymous_profile_id") REFERENCES "public"."anonymous_profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "review_author_blocks_blocker_user_unique" ON "review_author_blocks" USING btree ("blocker_user_id","blocked_author_user_id") WHERE "blocked_author_user_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "review_author_blocks_blocker_profile_unique" ON "review_author_blocks" USING btree ("blocker_user_id","blocked_anonymous_profile_id") WHERE "blocked_anonymous_profile_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "review_author_blocks_blocker_fingerprint_unique" ON "review_author_blocks" USING btree ("blocker_user_id","blocked_author_fingerprint_hash") WHERE "blocked_author_fingerprint_hash" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "review_author_blocks_blocker_idx" ON "review_author_blocks" USING btree ("blocker_user_id","created_at");

ALTER TABLE "reviews" ADD COLUMN "useful_vote_baseline" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "reviews" SET "useful_vote_baseline" = "useful_count";
--> statement-breakpoint
CREATE TABLE "review_useful_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"useful" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_useful_votes" ADD CONSTRAINT "review_useful_votes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "review_useful_votes" ADD CONSTRAINT "review_useful_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "review_useful_votes_review_user_unique" ON "review_useful_votes" USING btree ("review_id","user_id");
--> statement-breakpoint
CREATE INDEX "review_useful_votes_review_idx" ON "review_useful_votes" USING btree ("review_id","useful");
--> statement-breakpoint
CREATE INDEX "review_useful_votes_user_idx" ON "review_useful_votes" USING btree ("user_id","updated_at");

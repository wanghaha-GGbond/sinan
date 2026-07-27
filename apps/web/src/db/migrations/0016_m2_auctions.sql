CREATE TYPE "auction_status" AS ENUM('draft', 'live', 'closed', 'settled', 'cancelled');--> statement-breakpoint
CREATE TYPE "bid_status" AS ENUM('active', 'withdrawn', 'won', 'lost');--> statement-breakpoint

CREATE TABLE "auctions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "host_user_id" uuid NOT NULL,
  "host_display_name" text NOT NULL,
  "host_trust_level" integer NOT NULL,
  "host_company_name" text,
  "scenario_title" text NOT NULL,
  "scenario_desc" text NOT NULL,
  "duration_minutes" integer NOT NULL,
  "guide_price_min_cents" integer NOT NULL,
  "guide_price_max_cents" integer NOT NULL,
  "charity_flag" integer DEFAULT 1 NOT NULL,
  "status" "auction_status" DEFAULT 'draft' NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "final_amount_cents" integer,
  "winner_bid_id" uuid,
  "closed_at" timestamp with time zone,
  "settled_at" timestamp with time zone,
  "settlement_method" text,
  "settled_by_user_id" uuid,
  "cancelled_at" timestamp with time zone,
  "cancel_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "auction_bids" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "auction_id" uuid NOT NULL,
  "bidder_user_id" uuid NOT NULL,
  "bidder_trust_level" integer NOT NULL,
  "bidder_job_band" text,
  "amount_cents" bigint NOT NULL,
  "reason_text" text NOT NULL,
  "status" "bid_status" DEFAULT 'active' NOT NULL,
  "is_heart_pick" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "auctions" ADD CONSTRAINT "auctions_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id");--> statement-breakpoint
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_bidder_user_id_users_id_fk" FOREIGN KEY ("bidder_user_id") REFERENCES "public"."users"("id");--> statement-breakpoint
CREATE INDEX "auctions_status_starts_at_idx" ON "auctions" ("status", "starts_at");--> statement-breakpoint
CREATE INDEX "auctions_host_idx" ON "auctions" ("host_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auction_bids_auction_bidder_unique" ON "auction_bids" ("auction_id", "bidder_user_id");--> statement-breakpoint
CREATE INDEX "auction_bids_status_idx" ON "auction_bids" ("status");

-- 0014_m3_circles_dm.sql
-- M3 圈层 (circles + 背书入圈) + 私聊 (thread + messages + requests) — 5 表 + 3 enum
-- 详见 apps/web/src/db/schema/circles.ts 和 dm.ts

-- Enums
DO $$ BEGIN
  CREATE TYPE "circle_status" AS ENUM('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "circle_member_status" AS ENUM('pending', 'active', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "dm_request_status" AS ENUM('pending', 'accepted', 'rejected', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- circles
CREATE TABLE IF NOT EXISTS "circles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "min_trust_level" integer DEFAULT 1 NOT NULL,
  "status" "circle_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "circles_slug_unique" ON "circles" ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "circles_status_idx" ON "circles" ("status");
--> statement-breakpoint

-- circle_members
CREATE TABLE IF NOT EXISTS "circle_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "circle_id" uuid NOT NULL REFERENCES "circles"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "endorsed_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "status" "circle_member_status" DEFAULT 'active' NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone,
  "revoke_reason" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "circle_members_circle_user_unique" ON "circle_members" ("circle_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "circle_members_user_idx" ON "circle_members" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "circle_members_circle_status_idx" ON "circle_members" ("circle_id", "status");
--> statement-breakpoint

-- dm_threads
CREATE TABLE IF NOT EXISTS "dm_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "participant_a_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "participant_b_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "encryption_version" text DEFAULT 'none' NOT NULL,
  "last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dm_threads_participant_a_idx" ON "dm_threads" ("participant_a_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dm_threads_participant_b_idx" ON "dm_threads" ("participant_b_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dm_threads_last_message_idx" ON "dm_threads" ("last_message_at");
--> statement-breakpoint

-- dm_messages
CREATE TABLE IF NOT EXISTS "dm_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "thread_id" uuid NOT NULL REFERENCES "dm_threads"("id") ON DELETE CASCADE,
  "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dm_messages_thread_idx" ON "dm_messages" ("thread_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dm_messages_sender_idx" ON "dm_messages" ("sender_id");
--> statement-breakpoint

-- dm_requests
CREATE TABLE IF NOT EXISTS "dm_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "from_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "to_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "intro_text" text NOT NULL,
  "status" "dm_request_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "actioned_at" timestamp with time zone,
  "reject_reason" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dm_requests_to_status_idx" ON "dm_requests" ("to_user_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dm_requests_from_status_idx" ON "dm_requests" ("from_user_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dm_requests_created_idx" ON "dm_requests" ("created_at");

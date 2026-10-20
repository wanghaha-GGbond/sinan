-- 0015_m3_p1_features.sql
-- M3 P1: 高光馆 + 一技封神 + 感谢信漂流

DO $$ BEGIN
  CREATE TYPE "highlight_status" AS ENUM('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "skill_status" AS ENUM('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "highlights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "content" text NOT NULL,
  "status" "highlight_status" DEFAULT 'pending' NOT NULL,
  "reviewed_by_user_id" uuid REFERENCES "users"("id"),
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "highlights_status_created_at_idx" ON "highlights" ("status", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "highlights_user_idx" ON "highlights" ("user_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "skills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "name" text NOT NULL,
  "description" text NOT NULL,
  "evidence_note" text NOT NULL,
  "endorser_count" integer DEFAULT 0 NOT NULL,
  "status" "skill_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "skills_status_endorser_count_idx" ON "skills" ("status", "endorser_count");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "skills_user_idx" ON "skills" ("user_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "skill_endorsements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "skill_id" uuid NOT NULL REFERENCES "skills"("id") ON DELETE CASCADE,
  "endorser_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "skill_endorsements_skill_user_unique" ON "skill_endorsements" ("skill_id", "endorser_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "skill_endorsements_skill_idx" ON "skill_endorsements" ("skill_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "gratitude" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "from_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "to_user_id" uuid REFERENCES "users"("id"),
  "content" text NOT NULL,
  "is_anonymous" text DEFAULT 'false' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gratitude_to_created_at_idx" ON "gratitude" ("to_user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gratitude_from_created_at_idx" ON "gratitude" ("from_user_id", "created_at");

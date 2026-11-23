ALTER TABLE dialogue_sessions ADD COLUMN IF NOT EXISTS selection_mode text NOT NULL DEFAULT 'manual';
ALTER TABLE dialogue_sessions ADD COLUMN IF NOT EXISTS min_bid_points integer NOT NULL DEFAULT 1;
ALTER TABLE dialogue_sessions ADD COLUMN IF NOT EXISTS points_settled_at timestamptz;
ALTER TABLE dialogue_applications ADD COLUMN IF NOT EXISTS bid_points integer NOT NULL DEFAULT 0;
ALTER TABLE dialogue_applications ADD COLUMN IF NOT EXISTS points_state text NOT NULL DEFAULT 'none';
ALTER TABLE dialogue_applications ADD COLUMN IF NOT EXISTS bid_placed_at timestamptz(3);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dialogue_selection_mode' AND conrelid = 'dialogue_sessions'::regclass) THEN
  ALTER TABLE dialogue_sessions ADD CONSTRAINT dialogue_selection_mode CHECK(selection_mode IN ('manual','points') AND min_bid_points BETWEEN 1 AND 1000000 AND (selection_mode <> 'points' OR (capacity = 1 AND funding_mode = 'undecided')));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dialogue_application_points' AND conrelid = 'dialogue_applications'::regclass) THEN
  ALTER TABLE dialogue_applications ADD CONSTRAINT dialogue_application_points CHECK((points_state = 'none' AND bid_points = 0) OR (points_state IN ('held','spent','released') AND bid_points BETWEEN 1 AND 1000000 AND bid_placed_at IS NOT NULL));
 END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS point_accounts (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 available integer NOT NULL DEFAULT 0, frozen integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT point_account_bounds CHECK(available >= 0 AND frozen >= 0 AND available + frozen <= 1000000)
);
CREATE TABLE IF NOT EXISTS point_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 operation_key text NOT NULL, kind text NOT NULL,
 available_delta integer NOT NULL, frozen_delta integer NOT NULL, available_after integer NOT NULL, frozen_after integer NOT NULL,
 session_id uuid REFERENCES dialogue_sessions(id) ON DELETE SET NULL, actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 reason text NOT NULL DEFAULT '', created_at timestamptz(3) NOT NULL DEFAULT now(),
 CONSTRAINT point_entry_kind CHECK(kind IN ('task','activity','hold','release','spend','refund')),
 CONSTRAINT point_entry_bounds CHECK(available_after >= 0 AND frozen_after >= 0 AND available_after + frozen_after <= 1000000),
 CONSTRAINT point_entry_delta CHECK(available_delta <> 0 OR frozen_delta <> 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS point_entry_once ON point_entries(user_id,operation_key);
CREATE INDEX IF NOT EXISTS point_entry_owner ON point_entries(user_id,created_at,id);

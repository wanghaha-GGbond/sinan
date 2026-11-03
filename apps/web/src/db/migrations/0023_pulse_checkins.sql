CREATE TABLE IF NOT EXISTS "pulse_checkins" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "day" date NOT NULL,
  "energy" integer NOT NULL CHECK ("energy" BETWEEN 1 AND 10),
  "pressure" integer NOT NULL CHECK ("pressure" BETWEEN 1 AND 10),
  "work_minutes" integer CHECK ("work_minutes" BETWEEN 0 AND 1440),
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "day")
);

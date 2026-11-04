ALTER TABLE "pulse_checkins" ADD COLUMN IF NOT EXISTS "company_id" uuid REFERENCES "companies"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "pulse_checkins" ADD COLUMN IF NOT EXISTS "end_minute" integer CHECK ("end_minute" BETWEEN 0 AND 1439);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pulse_company_day_idx" ON "pulse_checkins" ("company_id", "day");

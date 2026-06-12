CREATE TABLE "email_verification_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verification_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "job_band" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "years_of_experience" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "highlight_moment" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "declined_offer" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_fields_status" jsonb;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "email_domains" jsonb;--> statement-breakpoint
ALTER TABLE "email_verification_codes" ADD CONSTRAINT "email_verification_codes_verification_id_company_verifications_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."company_verifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_verification_codes_verification_idx" ON "email_verification_codes" USING btree ("verification_id","created_at");
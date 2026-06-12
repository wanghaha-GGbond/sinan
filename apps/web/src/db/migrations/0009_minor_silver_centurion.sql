ALTER TYPE "public"."company_verification_proof_type" ADD VALUE 'salary_proof';--> statement-breakpoint
ALTER TYPE "public"."company_verification_status" ADD VALUE 'revoked';--> statement-breakpoint
DELETE FROM "company_verifications" WHERE "company_id" !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' OR "applicant_user_id" !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';--> statement-breakpoint
ALTER TABLE "company_verifications" ALTER COLUMN "company_id" SET DATA TYPE uuid USING "company_id"::uuid;--> statement-breakpoint
ALTER TABLE "company_verifications" ALTER COLUMN "applicant_user_id" SET DATA TYPE uuid USING "applicant_user_id"::uuid;--> statement-breakpoint
ALTER TABLE "company_verifications" ADD COLUMN "reviewed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "company_verifications" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "company_verifications" ADD COLUMN "reject_reason" text;--> statement-breakpoint
ALTER TABLE "company_verifications" ADD COLUMN "granted_trust_level" integer;--> statement-breakpoint
ALTER TABLE "company_verifications" ADD CONSTRAINT "company_verifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_verifications" ADD CONSTRAINT "company_verifications_applicant_user_id_users_id_fk" FOREIGN KEY ("applicant_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_verifications" ADD CONSTRAINT "company_verifications_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_verifications_applicant_idx" ON "company_verifications" USING btree ("applicant_user_id","created_at");
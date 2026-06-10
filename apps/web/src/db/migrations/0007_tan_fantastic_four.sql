CREATE TYPE "public"."company_verification_proof_type" AS ENUM('work_email', 'business_document');--> statement-breakpoint
CREATE TYPE "public"."company_verification_status" AS ENUM('submitted', 'reviewing', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "company_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"company_name" text NOT NULL,
	"applicant_user_id" text NOT NULL,
	"applicant_name" text NOT NULL,
	"work_email" text NOT NULL,
	"job_title" text NOT NULL,
	"proof_type" "company_verification_proof_type" NOT NULL,
	"note" text,
	"status" "company_verification_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "company_verifications_open_request_unique" ON "company_verifications" USING btree ("company_id","applicant_user_id") WHERE "company_verifications"."status" IN ('submitted', 'reviewing');--> statement-breakpoint
CREATE INDEX "company_verifications_status_idx" ON "company_verifications" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "company_verifications_company_idx" ON "company_verifications" USING btree ("company_id","created_at");
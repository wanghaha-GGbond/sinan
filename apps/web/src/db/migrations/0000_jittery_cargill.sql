CREATE TYPE "public"."anonymous_scope_type" AS ENUM('global', 'company', 'review', 'discussion');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"phone" text,
	"password_hash" text,
	"display_name" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"trust_level" integer DEFAULT 0 NOT NULL,
	"reputation_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "anonymous_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"scope_type" "anonymous_scope_type" NOT NULL,
	"scope_id" uuid,
	"display_label" text NOT NULL,
	"avatar_seed" text,
	"fingerprint_hash" text,
	"trust_level" integer DEFAULT 0 NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "anonymous_profiles" ADD CONSTRAINT "anonymous_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email") WHERE "users"."email" IS NOT NULL AND "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "users" USING btree ("phone") WHERE "users"."phone" IS NOT NULL AND "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_trust_level_idx" ON "users" USING btree ("trust_level");--> statement-breakpoint
CREATE UNIQUE INDEX "anon_profiles_user_scope_unique" ON "anonymous_profiles" USING btree ("user_id","scope_type","scope_id") WHERE "anonymous_profiles"."user_id" IS NOT NULL AND "anonymous_profiles"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "anon_profiles_fingerprint_scope_unique" ON "anonymous_profiles" USING btree ("fingerprint_hash","scope_type","scope_id") WHERE "anonymous_profiles"."fingerprint_hash" IS NOT NULL AND "anonymous_profiles"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "anon_profiles_user_idx" ON "anonymous_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "anon_profiles_scope_idx" ON "anonymous_profiles" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "anon_profiles_fingerprint_idx" ON "anonymous_profiles" USING btree ("fingerprint_hash");--> statement-breakpoint
CREATE INDEX "anon_profiles_last_used_idx" ON "anonymous_profiles" USING btree ("last_used_at");
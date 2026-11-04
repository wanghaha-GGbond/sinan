ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "session_version" integer NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "password_reset_tokens_expires_idx" ON "password_reset_tokens" ("expires_at");

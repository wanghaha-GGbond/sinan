CREATE TABLE IF NOT EXISTS "forum_posts" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "request_id" uuid NOT NULL DEFAULT gen_random_uuid(), "company_id" uuid NOT NULL REFERENCES companies(id),
 "author_user_id" uuid REFERENCES users(id), "category" text NOT NULL, "title" text NOT NULL, "content" text NOT NULL,
 "status" text NOT NULL DEFAULT 'pending_review', "created_at" timestamptz(3) NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz,
 CONSTRAINT "forum_post_category" CHECK (category IN ('question','experience','interview','career')),
 CONSTRAINT "forum_post_status" CHECK (status IN ('pending_review','visible','hidden','rejected','deleted')),
 CONSTRAINT "forum_post_length" CHECK (char_length(btrim(title)) BETWEEN 4 AND 100 AND char_length(btrim(content)) BETWEEN 10 AND 3000)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS forum_post_feed_idx ON forum_posts(status,created_at,id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS forum_post_company_idx ON forum_posts(company_id,status,created_at,id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS forum_post_author_idx ON forum_posts(author_user_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS forum_post_request_idx ON forum_posts(author_user_id,request_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forum_replies" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "request_id" uuid NOT NULL DEFAULT gen_random_uuid(), "post_id" uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
 "author_user_id" uuid REFERENCES users(id), "content" text NOT NULL, "status" text NOT NULL DEFAULT 'pending_review',
 "created_at" timestamptz(3) NOT NULL DEFAULT now(), "deleted_at" timestamptz,
 CONSTRAINT "forum_reply_status" CHECK (status IN ('pending_review','visible','hidden','rejected','deleted')),
 CONSTRAINT "forum_reply_length" CHECK (char_length(btrim(content)) BETWEEN 2 AND 1000)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS forum_reply_post_idx ON forum_replies(post_id,status,created_at,id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS forum_reply_author_idx ON forum_replies(author_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS forum_reply_request_idx ON forum_replies(author_user_id,request_id);
CREATE TABLE IF NOT EXISTS "forum_votes" (
 "post_id" uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE, "user_id" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(post_id,user_id)
);
CREATE INDEX IF NOT EXISTS forum_vote_user_idx ON forum_votes(user_id);
CREATE TABLE IF NOT EXISTS "forum_follows" (
 "company_id" uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE, "user_id" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(user_id,company_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forum_reports" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "post_id" uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
 "reply_id" uuid REFERENCES forum_replies(id) ON DELETE CASCADE, "reporter_user_id" uuid REFERENCES users(id),
 "target_key" text NOT NULL, "reason" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "resolved_at" timestamptz,
 CONSTRAINT "forum_report_reason" CHECK(reason IN ('privacy','attack','spam','other')),
 CONSTRAINT "forum_report_target" CHECK((reply_id IS NULL AND target_key = 'post:' || post_id::text) OR (reply_id IS NOT NULL AND target_key = 'reply:' || reply_id::text))
);
CREATE UNIQUE INDEX IF NOT EXISTS forum_report_dedupe ON forum_reports(reporter_user_id,target_key);
CREATE INDEX IF NOT EXISTS forum_report_queue_idx ON forum_reports(created_at) WHERE resolved_at IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forum_moderation_events" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "post_id" uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
 "reply_id" uuid REFERENCES forum_replies(id) ON DELETE CASCADE, "actor_user_id" uuid REFERENCES users(id),
 "from_status" text NOT NULL, "to_status" text NOT NULL, "reason" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS forum_event_post_idx ON forum_moderation_events(post_id,created_at);

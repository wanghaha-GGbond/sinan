CREATE TABLE IF NOT EXISTS dialogue_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by uuid REFERENCES users(id) ON DELETE SET NULL, request_id uuid NOT NULL,
 title text NOT NULL, description text NOT NULL, guest_name text NOT NULL, guest_bio text NOT NULL,
 company_id uuid REFERENCES companies(id) ON DELETE SET NULL, duration_minutes integer NOT NULL, capacity integer NOT NULL,
 starts_at timestamptz NOT NULL, signup_ends_at timestamptz NOT NULL, funding_mode text NOT NULL DEFAULT 'undecided', status text NOT NULL DEFAULT 'draft',
 guest_consent_confirmed boolean NOT NULL DEFAULT false, recap text NOT NULL DEFAULT '', recap_consent_confirmed boolean NOT NULL DEFAULT false,
 private_instructions text NOT NULL DEFAULT '', cancel_reason text, published_at timestamptz,
 created_at timestamptz(3) NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT dialogue_session_status CHECK(status IN ('draft','open','closed','completed','cancelled','hidden')),
 CONSTRAINT dialogue_funding_plan CHECK(funding_mode IN ('undecided','all_donated','host_and_donation')),
 CONSTRAINT dialogue_schedule CHECK(signup_ends_at < starts_at AND duration_minutes BETWEEN 15 AND 120 AND capacity BETWEEN 1 AND 20),
 CONSTRAINT dialogue_guest_consent CHECK(status NOT IN ('open','closed','completed') OR (guest_consent_confirmed AND published_at IS NOT NULL)),
 CONSTRAINT dialogue_recap_consent CHECK(recap = '' OR recap_consent_confirmed)
);
CREATE INDEX IF NOT EXISTS dialogue_public_idx ON dialogue_sessions(status,created_at,id);
CREATE INDEX IF NOT EXISTS dialogue_company_idx ON dialogue_sessions(company_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS dialogue_session_request ON dialogue_sessions(created_by,request_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS dialogue_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES dialogue_sessions(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, request_id uuid NOT NULL,
 question text NOT NULL, status text NOT NULL DEFAULT 'submitted', decision_note text,
 created_at timestamptz(3) NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT dialogue_application_status CHECK(status IN ('submitted','selected','not_selected','withdrawn')),
 CONSTRAINT dialogue_application_question CHECK((status = 'withdrawn' AND question = '') OR (status <> 'withdrawn' AND char_length(btrim(question)) BETWEEN 10 AND 800))
);
CREATE UNIQUE INDEX IF NOT EXISTS dialogue_application_person ON dialogue_applications(session_id,user_id);
CREATE INDEX IF NOT EXISTS dialogue_application_queue ON dialogue_applications(session_id,created_at,id);
CREATE INDEX IF NOT EXISTS dialogue_application_owner ON dialogue_applications(user_id,created_at,id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS dialogue_audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES dialogue_sessions(id) ON DELETE CASCADE,
 actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL, application_id uuid REFERENCES dialogue_applications(id) ON DELETE SET NULL,
 action text NOT NULL, from_status text, to_status text, reason text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dialogue_audit_session ON dialogue_audit_events(session_id,created_at);

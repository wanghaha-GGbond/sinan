# Free Preview registration testing

The Web app can run on a free `*.vercel.app` Preview URL without a custom domain.
The existing `workers.dev` production deployment is independent of this Preview.

## Mail configuration

In GitHub's protected `staging` environment, save `RESEND_API_KEY` and
`MAIL_TEST_RECIPIENT` as secrets. The recipient must be the email associated with
the Resend account. Set the environment variable `STAGING_MAIL_TEST_ENABLED=true`
to use `onboarding@resend.dev` in staging. Missing or false keeps mail disabled.
Other recipients are rejected before contacting Resend; production rejects this
shared sender and the recipient restriction.

For a single real-email acceptance run, also set
`STAGING_OWNER_MAIL_SMOKE_ENABLED=true`, approve that PR deployment, then reset it
to `false`. This sends one registration challenge through the deployed API and
records a registration link in the GitHub Job Summary. The owner must confirm
receipt and enter the code in the browser; provider acceptance alone does not
prove delivery. The code is never printed or stored as plaintext in the database.
The invitation remains only in the isolated seven-day PR database. This optional
test does not run against stable staging or production.

## Protected Preview tests

Release tests obtain a temporary development OIDC credential for the linked Web
project. Only that credential is forwarded from the project's environment; the
test database and application auth secret remain those of the approved CI job.
API requests cannot leave the exact Preview origin or follow redirects with the
credential. Browser requests attach it only to that origin. Diagnostic output
redacts the credential. Preview access protection remains enabled.

Every deployment still checks the exact Vercel project/team, applies all database
migrations twice, validates readiness, and exercises registration, login,
profiles, reviews, research, account deletion and password recovery.

## Public registration later

The Resend shared sender can deliver only to its account owner's mailbox. Public
email registration requires a verified sending domain. A free website hostname
does not grant control of DNS records for its parent domain.

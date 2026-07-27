const required = [
  "AUTH_SECRET",
  "DATABASE_URL",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "MAIL_FROM_DOMAIN",
  "ERROR_REPORTING_WEBHOOK",
  "APP_RELEASE",
  "NEXT_PUBLIC_APP_URL",
  "SUPPORT_EMAIL",
]

const missing = required.filter((name) => !process.env[name]?.trim())
const errors = []

if (missing.length) errors.push(`Missing: ${missing.join(", ")}`)
if (process.env.INVITE_REQUIRED !== "true") {
  errors.push("INVITE_REQUIRED must be true for the invite-only Beta")
}
if (process.env.MAIL_PROVIDER !== "resend") {
  errors.push("MAIL_PROVIDER must be resend for the launch environment")
}
if (process.env.DATABASE_DRIVER === "node-postgres") {
  errors.push("DATABASE_DRIVER=node-postgres is reserved for disposable local/CI databases")
}
if (process.env.NEXT_PUBLIC_API_ENABLED !== "true") {
  errors.push("NEXT_PUBLIC_API_ENABLED must be true; production cannot use mock fallbacks")
}
if (process.env.LAUNCH_SCOPE_ONLY !== "true") {
  errors.push("LAUNCH_SCOPE_ONLY must be true so deferred P2 routes stay unavailable")
}
if (process.env.NEXT_PUBLIC_APP_ENV !== "production" && process.env.NEXT_PUBLIC_APP_ENV !== "staging") {
  errors.push("NEXT_PUBLIC_APP_ENV must be staging or production")
}
if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) {
  errors.push("AUTH_SECRET must contain at least 32 characters")
}
if (process.env.ERROR_REPORTING_WEBHOOK) {
  try {
    const url = new URL(process.env.ERROR_REPORTING_WEBHOOK)
    if (url.protocol !== "https:") errors.push("ERROR_REPORTING_WEBHOOK must use HTTPS")
  } catch {
    errors.push("ERROR_REPORTING_WEBHOOK must be a valid URL")
  }
}
if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_APP_URL)
    if (url.protocol !== "https:") errors.push("NEXT_PUBLIC_APP_URL must use HTTPS")
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
      errors.push("NEXT_PUBLIC_APP_URL must not point to localhost")
    }
  } catch {
    errors.push("NEXT_PUBLIC_APP_URL must be a valid URL")
  }
}
if (process.env.SUPPORT_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.SUPPORT_EMAIL)) {
  errors.push("SUPPORT_EMAIL must be a valid email address")
}

if (errors.length) {
  console.error(`Release environment check failed:\n- ${errors.join("\n- ")}`)
  process.exit(1)
}

console.log(`Release environment is valid for ${process.env.NEXT_PUBLIC_APP_ENV}.`)

import { appendFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { mailConfigurationErrors } from "../src/lib/server/mail-configuration.mjs"

// Only an approved staging job can opt in to the account-owner mail sandbox.
export function stagingMailConfiguration(env) {
  if (env.NEXT_PUBLIC_APP_ENV !== "staging") throw new Error("Mail sandbox requires staging")
  const enabled = env.STAGING_MAIL_TEST_ENABLED || "false"
  if (!["true", "false"].includes(enabled)) throw new Error("STAGING_MAIL_TEST_ENABLED must be true or false")
  const configuration = enabled === "true"
    ? { MAIL_PROVIDER: "resend", MAIL_FROM_DOMAIN: "resend.dev", MAIL_FROM_ADDRESS: "onboarding@resend.dev" }
    : { MAIL_PROVIDER: "disabled", MAIL_FROM_DOMAIN: "example.invalid", MAIL_FROM_ADDRESS: "", MAIL_TEST_RECIPIENT: "", RESEND_API_KEY: "" }
  if (enabled === "true" && !env.MAIL_TEST_RECIPIENT?.trim()) throw new Error("MAIL_TEST_RECIPIENT is required for the staging mail sandbox")
  const errors = mailConfigurationErrors({ ...env, ...configuration })
  if (errors.length) throw new Error(errors.join("; "))
  return configuration
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const configuration = stagingMailConfiguration(process.env)
    if (!process.env.GITHUB_ENV) throw new Error("GITHUB_ENV is required")
    // The enabled branch writes only public sender settings. Credentials and
    // the allowed recipient stay in the job's encrypted environment secrets.
    appendFileSync(process.env.GITHUB_ENV, Object.entries(configuration).map(([key, value]) => `${key}=${value}\n`).join(""))
    console.log(`Staging mail: ${configuration.MAIL_PROVIDER === "resend" ? "account-owner test only" : "disabled"}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

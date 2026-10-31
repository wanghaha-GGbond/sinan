import { createHash } from "node:crypto"

export const authContract = 2 // Requires session_version and verified-email registration.

export function releaseConfiguration(target, env, release) {
  if (!["staging", "production"].includes(target)) throw new Error("Choose staging or production explicitly")
  if (!/^[a-f0-9]{40}$/.test(release)) throw new Error("A full Git SHA is required")
  const production = target === "production"
  const appUrl = production ? "https://zaichang.space" : "https://zaichang-staging.zaichang.workers.dev"
  const mailDomain = env.CF_MAIL_FROM_DOMAIN?.trim() || (production ? "" : "example.invalid")
  const supportEmail = env.CF_SUPPORT_EMAIL?.trim() || (production ? "" : "support@example.invalid")
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(mailDomain)) {
    throw new Error("CF_MAIL_FROM_DOMAIN must be a verified sending domain")
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) throw new Error("CF_SUPPORT_EMAIL is required")
  if (production && /(?:\.invalid|\.test|example\.com)$/i.test(mailDomain) && env.CF_VALIDATION_ONLY !== "true") {
    throw new Error("Production cannot use a placeholder sending domain")
  }
  if (production && /@(?:.*\.)?(?:example\.com|invalid|test)$/i.test(supportEmail) && env.CF_VALIDATION_ONLY !== "true") {
    throw new Error("Production cannot use a placeholder support address")
  }
  return {
    $schema: "../node_modules/wrangler/config-schema.json",
    name: production ? "zaichang" : "zaichang-staging",
    main: "../.open-next/worker.js",
    compatibility_date: "2026-09-18",
    compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
    workers_dev: true,
    preview_urls: false,
    ...(production ? { routes: [{ pattern: "zaichang.space", custom_domain: true, zone_name: "zaichang.space" }] } : {}),
    assets: { directory: "../.open-next/assets", binding: "ASSETS" },
    observability: { enabled: true, logs: { enabled: true, head_sampling_rate: 1 }, traces: { enabled: true, head_sampling_rate: 0.01 } },
    vars: {
      DEPLOYMENT_REGION: "global", DATABASE_ADAPTER: "neon",
      NEXT_PUBLIC_APP_URL: appUrl, NEXT_PUBLIC_APP_ENV: target,
      NEXT_PUBLIC_API_ENABLED: "true", NEXT_PUBLIC_PULSE_ENABLED: production ? "false" : "true",
      LAUNCH_SCOPE_ONLY: "true", INVITE_REQUIRED: production ? "false" : "true",
      MAIL_PROVIDER: production ? "resend" : "disabled",
      MAIL_FROM_DOMAIN: mailDomain, SUPPORT_EMAIL: supportEmail,
      ERROR_REPORTING_MODE: "stdout", AUTH_TRUSTED_IP_HEADER: "cf-connecting-ip",
      APP_RELEASE: release,
    },
  }
}

export function digest(value) {
  return createHash("sha256").update(value).digest("hex")
}

export function verifyRelease(manifest, { target, release, configDigest, bundleDigest }) {
  if (manifest.format !== 1 || !["staging", "production"].includes(target)) throw new Error("Unknown release format or target")
  if (manifest.target !== target || manifest.release !== release) throw new Error("Build target or Git SHA mismatch; rebuild")
  if (manifest.dirty || manifest.validationOnly) throw new Error("Uncommitted or validation-only builds cannot be released")
  if (manifest.authContract !== authContract) throw new Error("Unsafe authentication rollback target")
  if (manifest.configDigest !== configDigest || manifest.bundleDigest !== bundleDigest) throw new Error("Build files changed after validation; rebuild")
}

export function verifyRollback(current, previous) {
  if (current.target !== previous.target || current.worker !== previous.worker) throw new Error("Rollback must stay in the same environment")
  if (previous.dirty || previous.validationOnly || previous.authContract !== authContract) throw new Error("Unsafe authentication rollback target")
  if (current.migration !== previous.migration) throw new Error("Cross-migration rollback requires a separate compatibility review")
  if (current.release === previous.release) throw new Error("Rollback target must be a different verified release")
  if (![current, previous].every((item) => item.format === 1 && /^[a-f0-9]{40}$/.test(item.release))) throw new Error("Invalid release record")
}

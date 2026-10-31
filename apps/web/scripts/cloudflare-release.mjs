import { execFileSync, spawnSync } from "node:child_process"
import { readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync, existsSync, unlinkSync, realpathSync, readlinkSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { authContract, digest, releaseConfiguration, verifyRelease, verifyRollback } from "./cloudflare-release-policy.mjs"

const root = fileURLToPath(new URL("../", import.meta.url))
const output = path.join(root, ".release")
const configPath = path.join(output, "wrangler.json")
const manifestPath = path.join(output, "manifest.json")
const [command, target, previousPath] = process.argv.slice(2)
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim()
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"))
function run(binary, args, env = process.env) {
  const executable = [root, path.resolve(root, "../..")]
    .map(directory => path.join(directory, "node_modules/.bin", binary)).find(existsSync)
  if (!executable) throw new Error(`Missing project binary: ${binary}; run npm ci`)
  const result = spawnSync(executable, args, { cwd: root, stdio: "inherit", env })
  if (result.error || result.status !== 0) throw new Error(`${binary} failed (${result.status ?? "not started"})`)
}
function bundleDigest() {
  const entries = []
  const bundleRoot = realpathSync(path.join(root, ".open-next"))
  function walk(directory) {
    for (const name of readdirSync(directory).sort()) {
      const file = path.join(directory, name)
      const stat = lstatSync(file)
      if (stat.isSymbolicLink()) {
        // Next traces pg through an internal symlink. Its target is hashed at
        // its real location; external references and dangling links are unsafe.
        if (!realpathSync(file).startsWith(bundleRoot + path.sep)) throw new Error("Release bundle references a file outside the bundle")
        entries.push([path.relative(root, file), "symlink", readlinkSync(file)])
      } else if (stat.isDirectory()) walk(file)
      else entries.push([path.relative(root, file), digest(readFileSync(file))])
    }
  }
  walk(path.join(root, ".open-next"))
  return digest(JSON.stringify(entries))
}
function check() {
  const manifest = readJson(manifestPath)
  verifyRelease(manifest, { target, release: git("rev-parse", "HEAD"), configDigest: digest(readFileSync(configPath)), bundleDigest: bundleDigest() })
  if (git("status", "--porcelain")) throw new Error("Working tree changed; commit and rebuild before release")
  return manifest
}

try {
  if (!["staging", "production"].includes(target)) throw new Error("Usage: cloudflare-release.mjs build|verify|check-rollback <staging|production> [previous-manifest]")
  if (command === "build") {
    const release = git("rev-parse", "HEAD")
    const dirty = Boolean(git("status", "--porcelain"))
    const config = releaseConfiguration(target, process.env, release)
    mkdirSync(output, { recursive: true })
    // Invalidate old proof before attempting any new build.
    if (existsSync(manifestPath)) unlinkSync(manifestPath)
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n")
    const env = { ...process.env, ...config.vars, CLOUDFLARE: "1", NEXT_TELEMETRY_DISABLED: "1", WRANGLER_SEND_METRICS: "false", CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false" }
    // A build never needs application secrets or cloud credentials. Empty values
    // also prevent Next from loading these names out of a local .env file.
    for (const name of ["DATABASE_URL", "AUTH_SECRET", "CRON_SECRET", "RESEND_API_KEY", "ERROR_REPORTING_WEBHOOK", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_KEY", "CLOUDFLARE_ACCOUNT_ID", "ALIYUN_ACCESS_KEY_ID", "ALIYUN_ACCESS_KEY_SECRET"]) env[name] = ""
    run("opennextjs-cloudflare", ["build", "--config", configPath], env)
    run("wrangler", ["versions", "upload", "--config", configPath, "--dry-run"], env)
    run("wrangler", ["types", path.join(output, "worker-configuration.d.ts"), "--config", configPath, "--include-runtime", "false"], env)
    const journal = readJson(path.join(root, "src/db/migrations/meta/_journal.json"))
    if (git("rev-parse", "HEAD") !== release) throw new Error("Git HEAD changed during build; rebuild")
    const manifest = { format: 1, target, worker: config.name, release, dirty: dirty || Boolean(git("status", "--porcelain")), validationOnly: process.env.CF_VALIDATION_ONLY === "true", migration: journal.entries.at(-1).tag, authContract, configDigest: digest(readFileSync(configPath)), bundleDigest: bundleDigest(), builtAt: new Date().toISOString() }
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n")
    console.log(`Built ${target}: ${release}; ${manifest.migration}. No upload or traffic change performed.`)
  } else if (command === "verify") {
    check()
    console.log("Local release artifact is intact. Remote secrets, migrations, backup and health still require verification.")
  } else if (command === "check-rollback") {
    if (!previousPath) throw new Error("Previous verified release manifest is required")
    verifyRollback(check(), readJson(path.resolve(previousPath)))
    console.log("Local rollback compatibility check passed. Verify the corresponding Cloudflare version ID before any traffic switch.")
  } else {
    throw new Error("Direct deploy is disabled. Build and verify an explicit environment, then follow docs/cloudflare-runbook.md. No remote changes performed.")
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}

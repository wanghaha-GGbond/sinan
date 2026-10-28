import { spawnSync } from "node:child_process"
import { redactReleaseCredential } from "./release-vercel-auth.mjs"

try {
  for (const key of ["VERCEL_CLI_VERSION", "VERCEL_PROJECT_ID", "VERCEL_ORG_ID", "RELEASE_BASE_URL", "DATABASE_URL"]) {
    if (!process.env[key]) throw new Error(`Missing release test configuration: ${key}`)
  }
  // Extract only the temporary protection credential. The project's development
  // environment must not replace this job's isolated database or auth secret.
  const credentials = spawnSync("npx", ["--yes", `vercel@${process.env.VERCEL_CLI_VERSION}`, "env", "run",
    "--environment", "development", "--project", process.env.VERCEL_PROJECT_ID, "--scope", process.env.VERCEL_ORG_ID,
    "--", "node", "-e", "process.stdout.write(JSON.stringify({oidc:process.env.VERCEL_OIDC_TOKEN}))"], {
    input: "", encoding: "utf8", timeout: 90_000,
  })
  if (credentials.status !== 0) throw new Error("Unable to obtain temporary Vercel Preview access for release tests")
  let token
  try { token = JSON.parse(credentials.stdout).oidc } catch { /* Never echo credential output. */ }
  if (!token) throw new Error("Vercel did not provide a temporary Preview access credential")
  const env = { ...process.env, RELEASE_VERCEL_OIDC_TOKEN: token }
  const tests = spawnSync("npm", ["run", "test:e2e:release", "--workspace=@sinan/web"], {
    env, encoding: "utf8", timeout: 10 * 60_000, maxBuffer: 16 * 1024 * 1024,
  })
  process.stdout.write(redactReleaseCredential(tests.stdout || "", env))
  process.stderr.write(redactReleaseCredential(tests.stderr || "", env))
  if (tests.error) console.error("Release test process failed or timed out")
  process.exitCode = tests.status ?? 1
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}

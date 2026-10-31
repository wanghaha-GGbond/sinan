import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { existsSync, realpathSync } from "node:fs"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { setTimeout as delay } from "node:timers/promises"

// Build success cannot detect Next/OpenNext initialization failures. Exercise
// the real bundle in workerd, without cloud credentials, DB or mail access.
const root = fileURLToPath(new URL("../", import.meta.url))
const releaseDir = path.join(root, ".release")
const config = JSON.parse(await readFile(path.join(releaseDir, "wrangler.json"), "utf8"))
const target = config.vars.NEXT_PUBLIC_APP_ENV
assert.ok(["staging", "production"].includes(target))
const temporary = await mkdtemp(path.join(tmpdir(), "zaichang-runtime-"))
let worker
let workerClosed
let output = ""
try {
  const local = {
    name: "zaichang-runtime-test",
    main: path.resolve(releaseDir, config.main),
    compatibility_date: config.compatibility_date,
    compatibility_flags: config.compatibility_flags,
    assets: { ...config.assets, directory: path.resolve(releaseDir, config.assets.directory) },
    vars: { ...config.vars, DATABASE_URL: "", AUTH_SECRET: "", CRON_SECRET: "", RESEND_API_KEY: "" },
  }
  const configPath = path.join(temporary, "wrangler.json")
  await writeFile(configPath, JSON.stringify(local))
  const socket = createServer()
  socket.listen(0, "127.0.0.1")
  await once(socket, "listening")
  const port = socket.address().port
  await new Promise((resolve, reject) => socket.close(error => error ? reject(error) : resolve()))
  // Allowlist process plumbing, not application credentials or dotenv settings.
  const env = Object.fromEntries(["PATH", "HOME", "TMPDIR", "TEMP", "SystemRoot"].filter(key => process.env[key]).map(key => [key, process.env[key]]))
  Object.assign(env, { CI: "true", NO_COLOR: "1", WRANGLER_SEND_METRICS: "false", CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false" })
  const executable = [root, path.resolve(root, "../..")]
    .map(directory => path.join(directory, "node_modules/.bin/wrangler")).find(existsSync)
  assert.ok(executable, "Missing project Wrangler; run npm ci")
  worker = spawn(process.execPath, [realpathSync(executable), "dev", "--config", configPath,
    "--local", "--ip", "127.0.0.1", "--port", String(port), "--inspector-port", "0"], { cwd: temporary, env, stdio: ["ignore", "pipe", "pipe"] })
  workerClosed = new Promise(resolve => worker.once("close", resolve))
  let spawnError
  worker.on("error", error => { spawnError = error })
  for (const stream of [worker.stdout, worker.stderr]) stream.on("data", chunk => { output = (output + chunk).slice(-16_000) })
  const origin = `http://127.0.0.1:${port}`
  let live
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError
    if (worker.exitCode !== null) throw new Error(`Wrangler exited: ${worker.exitCode}`)
    try { live = await fetch(`${origin}/api/health/live`, { signal: AbortSignal.timeout(5_000) }); break } catch { await delay(250) }
  }
  assert.ok(live, "Local Worker did not start within 90s")
  assert.equal(live.status, 200, `live failed: ${(await live.clone().text()).slice(0, 1500)}`)
  assert.deepEqual(await live.json(), { status: "ok", service: "zaichang" })
  assert.match(live.headers.get("cache-control") ?? "", /no-store/)
  assert.equal(live.headers.get("x-frame-options"), "DENY")
  const request = pathname => fetch(`${origin}${pathname}`, { signal: AbortSignal.timeout(20_000), redirect: "manual" })
  const ready = await request("/api/health/ready")
  assert.equal(ready.status, 503, "Missing secrets must fail readiness, not pass or crash")
  assert.deepEqual(await ready.json(), { status: "not_ready", configuration: "invalid", database: "not_checked" })
  const registration = await request("/api/config/register")
  assert.equal(registration.status, 200)
  assert.deepEqual(await registration.json(), { inviteRequired: target === "staging", emailVerificationRequired: true, emailDeliveryAvailable: false })
  for (const pathname of ["/login", "/register", "/forgot-password", "/legal/privacy"]) {
    const page = await request(pathname)
    assert.equal(page.status, 200, `${pathname} must render in workerd`)
    assert.match(page.headers.get("content-type") ?? "", /text\/html/)
    assert.match(await page.text(), /在场/)
  }
  assert.equal((await request("/pulse")).status, target === "production" ? 404 : 200)
  assert.equal((await request("/community")).status, 404)
  console.log(`Cloudflare ${target} runtime passed: live, fail-closed readiness, registration config, account pages and launch boundaries. No remote writes.`)
} catch (error) {
  console.error(output)
  throw error
} finally {
  if (worker && worker.exitCode === null) {
    worker.kill("SIGTERM")
    const force = setTimeout(() => worker.kill("SIGKILL"), 5_000)
    await workerClosed
    clearTimeout(force)
  }
  await rm(temporary, { recursive: true, force: true })
}

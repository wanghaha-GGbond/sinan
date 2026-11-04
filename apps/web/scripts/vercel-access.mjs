import { pathToFileURL } from "node:url"

/** Check the exact project, not just whether a browser session is logged in. */
export async function verifyVercelAccess(env, request = fetch) {
  for (const name of ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"]) {
    if (!env[name]?.trim()) throw new Error(`Missing staging configuration: ${name}`)
  }
  const url = new URL(`https://api.vercel.com/v9/projects/${encodeURIComponent(env.VERCEL_PROJECT_ID.trim())}`)
  url.searchParams.set("teamId", env.VERCEL_ORG_ID.trim())
  let response
  try {
    response = await request(url, {
      headers: { Authorization: `Bearer ${env.VERCEL_TOKEN.trim()}` },
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    })
  } catch {
    throw new Error("Vercel project access check could not connect; no deployment was attempted")
  }
  // Never print the provider body: it can contain credentials or private metadata.
  if (response.status === 401) {
    throw new Error("VERCEL_TOKEN is invalid, expired or revoked. Replace the protected staging secret with a dedicated deployment token, not a temporary MCP login token")
  }
  if (response.status === 403 || response.status === 404) {
    throw new Error("VERCEL_TOKEN cannot access VERCEL_PROJECT_ID in VERCEL_ORG_ID. Check the token's project/team scope and both resource IDs")
  }
  if (!response.ok) throw new Error(`Vercel project access check failed (HTTP ${response.status})`)
  let project
  try { project = await response.json() } catch { throw new Error("Invalid Vercel project response") }
  if (project.id !== env.VERCEL_PROJECT_ID.trim() || project.accountId !== env.VERCEL_ORG_ID.trim()) {
    throw new Error("Vercel project/team response does not match the configured staging target")
  }
  if (project.rootDirectory !== "apps/web" || project.framework !== "nextjs") {
    throw new Error("Vercel staging project must use the apps/web root directory and Next.js framework")
  }
  return { id: project.id, accountId: project.accountId }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await verifyVercelAccess(process.env)
    console.log("Vercel staging project access verified; no deployment was performed.")
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

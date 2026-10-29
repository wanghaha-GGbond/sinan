import type { APIRequestContext, BrowserContext, Route } from "@playwright/test"
import { test as base, expect } from "./database-fixture"
import { releaseProtectionHeaders, releaseRequestOptions, redactReleaseCredential } from "../scripts/release-vercel-auth.mjs"

const pendingRoutes = new WeakMap<BrowserContext, Set<Promise<void>>>()

export async function installReleaseProxy(context: BrowserContext, env = process.env) {
  const origin = new URL(env.RELEASE_BASE_URL!).origin
  const pending = new Set<Promise<void>>()
  pendingRoutes.set(context, pending)
  const handle = async (route: Route) => {
    const request = route.request()
    const headers = releaseProtectionHeaders(request.url(), request.headers(), env)
    if (new URL(request.url()).origin !== origin) return route.continue({ headers })
    try {
      // Redirects return to the browser so credentials are checked per origin.
      const response = await route.fetch({ headers, maxRedirects: 0 })
      await route.fulfill({ response })
    } catch (error) {
      throw new Error(redactReleaseCredential(error instanceof Error ? error.message : String(error), env))
    }
  }
  await context.route("**/*", async (route) => {
    const task = handle(route)
    pending.add(task)
    try { await task } finally { pending.delete(task) }
  })
}

async function drainReleaseRoutes(context: BrowserContext) {
  const pending = pendingRoutes.get(context)
  // unrouteAll clears the handler list before waiting. With multiple active
  // requests, the first completion can then disable interception underneath
  // another response. Keep the handler installed until every proxy settles.
  while (pending?.size) await Promise.all([...pending])
  await context.unrouteAll({ behavior: "wait" })
}

export function authorizedReleaseRequest(request: APIRequestContext): APIRequestContext {
  const methods = new Set(["get", "post", "put", "patch", "delete", "head", "fetch"])
  return new Proxy(request, {
    get(target, property) {
      const value = Reflect.get(target, property, target)
      if (typeof value !== "function") return value
      if (!methods.has(String(property))) return value.bind(target)
      return async (url: string, options?: Record<string, unknown>) => {
        try {
          return await value.call(target, url, releaseRequestOptions(url, options, process.env))
        } catch (error) {
          throw new Error(redactReleaseCredential(error instanceof Error ? error.message : String(error), process.env))
        }
      }
    },
  })
}

export const test = base.extend({
  context: async ({ context }, completeFixture) => {
    if (process.env.RELEASE_VERCEL_OIDC_TOKEN) {
      await installReleaseProxy(context)
    }
    try {
      await completeFixture(context)
    } finally {
      await drainReleaseRoutes(context)
    }
  },
  page: async ({ page }, completeFixture) => {
    try {
      await completeFixture(page)
    } finally {
      // The base page fixture closes before the context fixture tears down.
      // Drain routed background requests while the page and test are alive.
      await drainReleaseRoutes(page.context())
    }
  },
  request: async ({ request }, completeFixture) => {
    await completeFixture(authorizedReleaseRequest(request))
  },
})

export { expect }

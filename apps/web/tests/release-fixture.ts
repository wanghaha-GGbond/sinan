import type { APIRequestContext } from "@playwright/test"
import { test as base, expect } from "./database-fixture"
import { releaseProtectionHeaders, releaseRequestOptions, redactReleaseCredential } from "../scripts/release-vercel-auth.mjs"

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
      const origin = new URL(process.env.RELEASE_BASE_URL!).origin
      await context.route("**/*", async (route) => {
        const request = route.request()
        const headers = releaseProtectionHeaders(request.url(), request.headers(), process.env)
        if (new URL(request.url()).origin !== origin) return route.continue({ headers })
        try {
          // Let the browser follow redirects, checking every new destination
          // before attaching the temporary Preview protection credential.
          const response = await route.fetch({ headers, maxRedirects: 0 })
          await route.fulfill({ response })
        } catch (error) {
          throw new Error(redactReleaseCredential(error instanceof Error ? error.message : String(error), process.env))
        }
      })
    }
    try {
      await completeFixture(context)
    } finally {
      await context.unrouteAll({ behavior: "wait" })
    }
  },
  page: async ({ page }, completeFixture) => {
    try {
      await completeFixture(page)
    } finally {
      // The base page fixture closes before the context fixture tears down.
      // Drain routed background requests while the page and test are alive.
      await page.context().unrouteAll({ behavior: "wait" })
    }
  },
  request: async ({ request }, completeFixture) => {
    await completeFixture(authorizedReleaseRequest(request))
  },
})

export { expect }

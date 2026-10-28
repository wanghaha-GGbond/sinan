import { createServer, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"
import { expect, test } from "./release-fixture"

let baseURL = ""
let started: () => void
let startedRequest: Promise<void>
let finished = false
let releaseResponse: ServerResponse | undefined
const server = createServer((request, response) => {
  if (request.url === "/background") {
    releaseResponse = response
    started()
    // The test deliberately finishes while a routed backend response is pending.
    setTimeout(() => response.end("background complete"), 300)
  } else response.end("<!doctype html><title>Preview request lifecycle</title>")
})

test.beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
test.afterAll(async () => {
  releaseResponse?.end()
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

test("a page can finish with a real routed background request still in flight", async ({ page, context }) => {
  startedRequest = new Promise<void>((resolve) => { started = resolve })
  await context.route("**/background", async (route) => {
    const response = await route.fetch()
    await route.fulfill({ response })
    finished = true
  })
  await page.goto(baseURL)
  await page.evaluate(() => { void fetch("/background") })
  await startedRequest
  expect(finished).toBe(false)
})

test("the preceding page fixture drained its request before closing", async () => {
  expect(finished).toBe(true)
})

test("mail failure mock takes precedence over the proxy across navigation", async ({ page, context }) => {
  let proxiedMailRequests = 0
  let mockCalls = 0
  await context.route("**/*", async (route) => {
    if (route.request().url().endsWith("/api/auth/forgot-password")) proxiedMailRequests++
    const response = await route.fetch({ maxRedirects: 0 })
    await route.fulfill({ response })
  })
  await context.route("**/api/auth/forgot-password", (route) => {
    mockCalls++
    return route.fulfill({ status: 503, json: { error: "邮件找回暂不可用，请稍后再试" } })
  })
  await page.goto(baseURL + "/forgot-password")
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/auth/forgot-password", { method: "POST" })
    return { status: response.status, body: await response.json() }
  })
  expect(result.status).toBe(503)
  expect(result.body.error).toContain("邮件找回暂不可用")
  startedRequest = new Promise<void>((resolve) => { started = resolve })
  await page.evaluate(() => { void fetch("/background") })
  await startedRequest
  await page.goto(baseURL + "/reset-password")
  expect(mockCalls).toBe(1)
  expect(proxiedMailRequests).toBe(0)
})

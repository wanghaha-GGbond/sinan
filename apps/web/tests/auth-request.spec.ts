import { expect, test } from "@playwright/test"
import { NextRequest } from "next/server"
import { checkAuthWriteRequest } from "../src/lib/server/auth-request"
import { POST as login } from "../src/app/api/auth/login/route"
import { POST as register } from "../src/app/api/auth/register/route"
import { POST as code } from "../src/app/api/auth/register-code/route"
import { POST as forgot } from "../src/app/api/auth/forgot-password/route"
import { POST as reset } from "../src/app/api/auth/reset-password/route"
import { POST as logout } from "../src/app/api/auth/logout/route"
import { GET as session } from "../src/app/api/auth/me/route"
import { GET as dashboard } from "../src/app/api/me/route"
import { getAuthUserFromRequest, signToken } from "../src/lib/server/auth"

test("an unverified database session is unavailable, not a signed-out response", async () => {
  const previous = [process.env.DATABASE_URL, process.env.NEXT_PUBLIC_APP_ENV, process.env.AUTH_SECRET]
  try {
    delete process.env.DATABASE_URL
    process.env.NEXT_PUBLIC_APP_ENV = "staging"
    process.env.AUTH_SECRET = "isolated-session-lookup-fixture-not-for-deployment"
    const token = await signToken({ userId: "01234567-89ab-4def-8123-456789012345", role: "user" })
    const bearer = (value: string) => new NextRequest("https://fixture.test/api/auth/me", { headers: { Authorization: `Bearer ${value}` } })
    for (const handler of [session, dashboard]) {
      const result = await handler(bearer(token))
      expect(result.status).toBe(503)
      expect(result.headers.get("cache-control")).toContain("no-store")
    }
    expect(await getAuthUserFromRequest(bearer(token))).toBeNull()
    const invalid = await session(bearer("invalid-fixture"))
    expect(invalid.status).toBe(200)
    expect(await invalid.json()).toEqual({ user: null })
  } finally {
    for (const [i, key] of ["DATABASE_URL", "NEXT_PUBLIC_APP_ENV", "AUTH_SECRET"].entries()) {
      if (previous[i] === undefined) delete process.env[key]
      else process.env[key] = previous[i]
    }
  }
})

function request(headers: Record<string, string>, url = "https://zaichang.test/api/auth/login") {
  return new NextRequest(url, { method: "POST", headers, body: "{}" })
}

test("auth writes allow same-origin JSON and originless native JSON, not simple form bodies", () => {
  expect(checkAuthWriteRequest(request({ Origin: "https://zaichang.test", "Content-Type": "application/json; charset=utf-8" }))).toBeNull()
  expect(checkAuthWriteRequest(request({ "X-Sinan-Client": "ios", "Content-Type": "application/json" }))).toBeNull()
  for (const type of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data", ""]) {
    expect(checkAuthWriteRequest(request({ "Content-Type": type }))?.status).toBe(415)
  }
})

test("auth origin checks handle reverse proxies without trusting client or forwarded headers", () => {
  expect(checkAuthWriteRequest(request({ Origin: "https://zaichang.test", Host: "zaichang.test", "Content-Type": "application/json" }, "http://localhost/api/auth/login"))).toBeNull()
  expect(checkAuthWriteRequest(request({ Origin: "http://127.0.0.1:3108", Host: "127.0.0.1:3108", "Content-Type": "application/json" }, "http://localhost:3108/api/auth/login"))).toBeNull()
  for (const origin of ["null", "https://foreign.test", "https://zaichang.test.foreign.test", "https://zaichang.test/path", "http://zaichang.test"]) {
    expect(checkAuthWriteRequest(request({ Origin: origin, "Content-Type": "application/json", "X-Sinan-Client": "ios", "X-Forwarded-Host": "foreign.test" }))?.status).toBe(403)
  }
  expect(checkAuthWriteRequest(request({ "Content-Type": "application/json", "Sec-Fetch-Site": "cross-site" }))?.status).toBe(403)
  expect(checkAuthWriteRequest(request({ "Content-Type": "application/json", "Sec-Fetch-Site": "same-site" }))?.status).toBe(403)
})

test("every auth mutation rejects a forged browser origin before cookies, DB or mail", async () => {
  for (const handler of [login, register, code, forgot, reset, logout]) {
    const response = await handler(request({ Origin: "https://foreign.test", "X-Sinan-Client": "ios", "Content-Type": "application/json" }))
    expect(response.status).toBe(403)
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(response.headers.get("set-cookie")).toBeNull()
  }
})

test("auth JSON endpoints reject JSON-shaped text/plain CSRF bodies before side effects", async () => {
  for (const handler of [login, register, code, forgot, reset]) {
    const response = await handler(request({ "Content-Type": "text/plain" }))
    expect(response.status).toBe(415)
    expect(response.headers.get("set-cookie")).toBeNull()
  }
})

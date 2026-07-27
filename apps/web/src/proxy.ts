/**
 * Next.js proxy: apply request-dependent security headers.
 *
 * This remains request-scoped because the CSP differs between development
 * and production. Proxy runs in the Node.js runtime in Next.js 16.
 */

import { NextRequest, NextResponse } from "next/server"

import { isDeferredLaunchPath } from "@/lib/launch-scope"

const isProd = process.env.NODE_ENV === "production"

function buildCsp(): string {
  const scriptSrc = ["'self'", "'unsafe-inline'"]
  if (!isProd) scriptSrc.push("'unsafe-eval'")

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:",
  ].join("; ")
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp())
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  )

  if (isProd) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    )
  }

  return response
}

export function proxy(request: NextRequest) {
  if (
    process.env.LAUNCH_SCOPE_ONLY === "true" &&
    isDeferredLaunchPath(request.nextUrl.pathname)
  ) {
    if (!request.nextUrl.pathname.startsWith("/api/")) {
      // Keep deferred deep links inside the app shell. Rewriting to a missing
      // internal route lets Next render app/not-found.tsx while preserving the
      // requested URL and the required 404 status.
      return withSecurityHeaders(
        NextResponse.rewrite(
          new URL("/__sinan_launch_not_found__", request.url),
          { status: 404 },
        ),
      )
    }

    return withSecurityHeaders(
      NextResponse.json({ error: "Not found" }, { status: 404 }),
    )
  }

  return withSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}

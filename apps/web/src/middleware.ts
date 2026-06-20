/**
 * Next.js middleware: security headers + auth-context cookie echo.
 *
 * Why middleware (not next.config.ts headers()): we want
 *   1. CSP that varies by request (dev vs prod), and
 *   2. Per-route overrides if we ever need to relax for OG images.
 * Edge runtime — no Node APIs available; uses Web Crypto only.
 */

import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

/**
 * CSP rationale (locked down 2026-06-20, Sprint 16 收尾):
 *  - default-src 'self': only same-origin unless explicitly allowed
 *  - script-src 'self' + 'unsafe-inline' + 'unsafe-eval': Next.js 16
 *    still inlines some hydration boot scripts; Turbopack dev needs
 *    'unsafe-eval'. In prod we drop 'unsafe-eval'.
 *  - style-src 'unsafe-inline': shadcn/ui + Tailwind v4 inline critical CSS
 *  - img-src 'self' data: blob:: all avatars are generated locally
 *    (`lib/avatar.ts`), no external CDN. blob: covers ImageResponse OG.
 *  - connect-src 'self': all API calls are same-origin
 *  - frame-ancestors 'none': defense in depth vs X-Frame-Options
 *  - form-action 'self': no third-party form targets
 *  - base-uri 'self': no <base> hijack
 *  - object-src 'none': no Flash/Java
 */
function buildCsp(): string {
  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (!isProd) scriptSrc.push("'unsafe-eval'");

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
  ].join("; ");
}

/**
 * Security headers applied to every response.
 * CSP + Permissions-Policy are request-dependent (built per response);
 * the rest are constants.
 */
function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("Content-Security-Policy", buildCsp());
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  if (isProd) {
    // HSTS — only emit in prod over real HTTPS. Localhost ignores it anyway.
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  return res;
}

export function middleware() {
  const res = NextResponse.next();
  return withSecurityHeaders(res);
}

/**
 * Matcher: run on everything except static assets and the OG image route
 * (OG is rendered as image/png so CSP img-src doesn't apply on the response
 * itself, and we still want headers on it for cache directives etc).
 * Static asset exclusion keeps middleware work minimal — next/image and
 * /_next/static are immutable and we don't need to re-add headers per-request.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};

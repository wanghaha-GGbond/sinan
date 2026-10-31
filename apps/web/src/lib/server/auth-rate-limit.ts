import { isIP } from "node:net"
import { checkPersistentRateLimit } from "@/lib/server/persistent-rate-limit"

export function getAuthClientKey(request: Request): string {
  // Cloudflare overwrites CF-Connecting-IP. Other hosts must explicitly select
  // a header their trusted proxy overwrites; never trust arbitrary XFF input.
  const header = process.env.AUTH_TRUSTED_IP_HEADER ?? "cf-connecting-ip"
  if (!["cf-connecting-ip", "x-vercel-forwarded-for", "x-real-ip"].includes(header)) return "unknown"
  const value = request.headers.get(header)?.trim()
  return value && isIP(value) ? value : "unknown"
}

export async function checkAuthIpLimit(request: Request, action: "login" | "register" | "register-code" | "forgot-password" | "reset-password") {
  const config = action === "register"
    ? { maxRequests: 3, windowSeconds: 3600 }
    : action === "login"
      ? { maxRequests: 5, windowSeconds: 60 }
      : { maxRequests: 10, windowSeconds: 900 }
  return checkPersistentRateLimit(`auth:${action}:ip:${getAuthClientKey(request)}`, config)
}

export async function checkAuthAccountLimit(action: "login" | "forgot-password" | "register-code", identity: string) {
  return checkPersistentRateLimit(`auth:${action}:account:${identity}`, action === "login"
    ? { maxRequests: 30, windowSeconds: 900 }
    : action === "register-code"
      ? { maxRequests: 1, windowSeconds: 60 }
      : { maxRequests: 3, windowSeconds: 3600 })
}

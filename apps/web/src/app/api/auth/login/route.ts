import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull, or } from "drizzle-orm"
import { users } from "@/db/schema/users"
import { verifyPassword, setAuthCookie } from "@/lib/server/auth"
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rate-limit"
import { isDevAuthEnabled } from "@/lib/server/dev-auth"

export async function POST(request: NextRequest) {
  const nativeClient = request.headers.get("x-sinan-client") === "ios"
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const email = body.email ? String(body.email).trim().toLowerCase() : undefined
  const phone = body.phone ? String(body.phone).trim() : undefined
  const password = String(body.password ?? "")

  if (!email && !phone) {
    return NextResponse.json(
      { error: "Email or phone is required" },
      { status: 400 }
    )
  }

  if (!password) {
    return NextResponse.json(
      { error: "Password is required" },
      { status: 400 }
    )
  }

  // Rate limit only actual login attempts (after validation passes),
  // so typos and format errors don't consume the quota.
  const rlKey = `login:${getRateLimitKey(request, "/api/auth/login")}`
  const rl = checkRateLimit(rlKey, { maxRequests: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts", retryAfter: rl.retryAfter },
      { status: 429 }
    )
  }

  // Explicit local-only preview mode. Missing production configuration must
  // fail closed instead of exposing hard-coded development identities.
  if (isDevAuthEnabled()) {
    const developerEmail = "developer@sinanapp.cn"
    const isDeveloperAccount =
      email === developerEmail && password === "sinan-dev-2026"

    if (isDeveloperAccount) {
      const token = await setAuthCookie({ userId: "dev-admin-001", role: "admin" })
      return NextResponse.json({
        user: {
          id: "dev-admin-001",
          displayName: "在场开发者",
          role: "admin",
        }, ...(nativeClient ? { token } : {}),
      })
    }

    const testEmail = "test@sinanapp.cn"
    const testPhone = "13800138000"
    const isTestAccount =
      (email === testEmail || phone === testPhone) && password === "test1234"

    if (isTestAccount) {
      const token = await setAuthCookie({ userId: "dev-user-001", role: "user" })
      return NextResponse.json({
        user: {
          id: "dev-user-001",
          displayName: "指路人#042",
          role: "user",
        }, ...(nativeClient ? { token } : {}),
      })
    }

    return NextResponse.json(
      { error: "Invalid local development credentials" },
      { status: 503 }
    )
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }

  try {
    const { db } = await import("@/db/client")

    const emailOrPhoneChecks: ReturnType<typeof eq>[] = []
    if (email) emailOrPhoneChecks.push(eq(users.email, email))
    if (phone) emailOrPhoneChecks.push(eq(users.phone, phone))

    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          eq(users.status, "active"),
          or(...emailOrPhoneChecks)
        )
      )
      .limit(1)

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id))

    const token = await setAuthCookie({ userId: user.id, role: user.role })

    return NextResponse.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        role: user.role,
      }, ...(nativeClient ? { token } : {}),
    })
  } catch (error) {
    console.error("POST /api/auth/login failed:", error)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}

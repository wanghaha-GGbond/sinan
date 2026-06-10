import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull, or } from "drizzle-orm"
import { users } from "@/db/schema/users"
import { verifyPassword, setAuthCookie } from "@/lib/server/auth"
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rate-limit"

export async function POST(request: NextRequest) {
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

  // Dev bypass: when no DATABASE_URL, accept local-only preview accounts.
  if (!process.env.DATABASE_URL) {
    const developerEmail = "developer@sinan.app"
    const isDeveloperAccount =
      email === developerEmail && password === "sinan-dev-2026"

    if (isDeveloperAccount) {
      await setAuthCookie({ userId: "dev-admin-001", role: "admin" })
      return NextResponse.json({
        user: {
          id: "dev-admin-001",
          displayName: "司南开发者",
          role: "admin",
        },
      })
    }

    const testEmail = "test@sinan.app"
    const testPhone = "13800138000"
    const isTestAccount =
      (email === testEmail || phone === testPhone) && password === "test1234"

    if (isTestAccount) {
      await setAuthCookie({ userId: "dev-user-001", role: "user" })
      return NextResponse.json({
        user: {
          id: "dev-user-001",
          displayName: "指路人#042",
          role: "user",
        },
      })
    }

    return NextResponse.json(
      { error: "Invalid local development credentials" },
      { status: 503 }
    )
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

    await setAuthCookie({ userId: user.id, role: user.role })

    return NextResponse.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("POST /api/auth/login failed:", error)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}

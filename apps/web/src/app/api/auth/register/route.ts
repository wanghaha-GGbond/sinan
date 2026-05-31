import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull, or } from "drizzle-orm"
import { users } from "@/db/schema/users"
import { hashPassword, setAuthCookie } from "@/lib/server/auth"
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rate-limit"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^1[3-9]\d{9}$/

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

  // Must provide email or phone
  if (!email && !phone) {
    return NextResponse.json(
      { error: "Email or phone is required" },
      { status: 400 }
    )
  }

  // Validate email format
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 }
    )
  }

  // Validate phone format
  if (phone && !PHONE_RE.test(phone)) {
    return NextResponse.json(
      { error: "Invalid phone format" },
      { status: 400 }
    )
  }

  // Password requirements
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    )
  }

  // Hash password BEFORE database check so the timing profile is identical
  // whether the account already exists or is new — prevents timing-based
  // enumeration of registered emails/phones.
  const passwordHash = await hashPassword(password)
  const displayName = email
    ? email.split("@")[0]
    : `用户${phone?.slice(-4) ?? ""}`

  // Rate limit only actual registration attempts (after validation passes),
  // so typos and format errors don't consume the quota.
  const rlKey = `register:${getRateLimitKey(request)}`
  const rl = checkRateLimit(rlKey, { maxRequests: 3, windowSeconds: 3600 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts", retryAfter: rl.retryAfter },
      { status: 429 }
    )
  }

  // Dev bypass: when no DATABASE_URL, accept a test registration
  if (!process.env.DATABASE_URL) {
    await setAuthCookie({ userId: "dev-user-001", role: "user" })
    return NextResponse.json(
      {
        user: {
          id: "dev-user-001",
          displayName: email ? email.split("@")[0] : `用户${phone?.slice(-4) ?? ""}`,
          role: "user",
        },
      },
      { status: 201 }
    )
  }

  try {
    const { db } = await import("@/db/client")

    // Check for duplicate email or phone
    const dupChecks: ReturnType<typeof and>[] = [isNull(users.deletedAt)]
    if (email) dupChecks.push(eq(users.email, email))
    if (phone) dupChecks.push(eq(users.phone, phone))

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        email && phone
          ? and(isNull(users.deletedAt), or(eq(users.email, email), eq(users.phone, phone)))
          : and(...dupChecks)
      )
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: "Email or phone already registered" },
        { status: 409 }
      )
    }

    const [user] = await db
      .insert(users)
      .values({
        email,
        phone,
        passwordHash,
        displayName,
        role: "user",
        status: "active",
      })
      .returning()

    await setAuthCookie({ userId: user.id, role: user.role })

    return NextResponse.json(
      {
        user: {
          id: user.id,
          displayName: user.displayName,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    // 23505 = unique_violation — concurrent registration raced with our SELECT
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "Email or phone already registered" },
        { status: 409 }
      )
    }
    console.error("POST /api/auth/register failed:", error)
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}

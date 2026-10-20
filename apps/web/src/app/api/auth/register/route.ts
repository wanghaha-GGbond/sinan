import { NextRequest, NextResponse } from "next/server"
import { and, eq, isNull, or } from "drizzle-orm"
import { users } from "@/db/schema/users"
import { hashPassword, setAuthCookie } from "@/lib/server/auth"
import { checkAuthIpLimit } from "@/lib/server/auth-rate-limit"
import { isNewPasswordValid } from "@/lib/server/password-recovery-policy"
import {
  consumeInvite,
  findInvite,
  isInviteRequired,
} from "@/lib/server/invites"
import { isDevAuthEnabled } from "@/lib/server/dev-auth"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^1[3-9]\d{9}$/

export async function POST(request: NextRequest) {
  const nativeClient = request.headers.get("x-sinan-client") === "ios"
  let body: Record<string, unknown>
  try {
    body = await request.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body")
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const email = body.email ? String(body.email).trim().toLowerCase() : undefined
  const phone = body.phone ? String(body.phone).trim() : undefined
  const password = String(body.password ?? "")
  const inviteCode = body.inviteCode ? String(body.inviteCode).trim().toUpperCase() : undefined

  // Must provide email or phone
  if (!email && !phone) {
    return NextResponse.json(
      { error: "Email or phone is required" },
      { status: 400 }
    )
  }

  // Validate email format
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) {
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
  if (!isNewPasswordValid(password)) {
    return NextResponse.json(
      { error: "Password must be 8–128 characters" },
      { status: 400 }
    )
  }

  const displayName = email
    ? email.split("@")[0]
    : `用户${phone?.slice(-4) ?? ""}`

  if (isInviteRequired() && !inviteCode) {
    return NextResponse.json({ error: "Invite code required" }, { status: 403 })
  }

  // Rate limit only actual registration attempts (after validation passes),
  // so typos and format errors don't consume the quota.
  const rl = await checkAuthIpLimit(request, "register")
  if (!rl.allowed) {
    if (rl.unavailable) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    return NextResponse.json(
      { error: "Too many registration attempts", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }

  // Expensive password hashing must happen after the shared abuse check.
  const passwordHash = await hashPassword(password)

  // Explicit local-only preview mode. Never infer a bypass merely because a
  // deployed database variable is missing.
  if (isDevAuthEnabled()) {
    const token = await setAuthCookie({ userId: "dev-user-001", role: "user" })
    return NextResponse.json(
      {
        user: {
          id: "dev-user-001",
          displayName: email ? email.split("@")[0] : `用户${phone?.slice(-4) ?? ""}`,
          role: "user",
        }, ...(nativeClient ? { token } : {}),
      },
      { status: 201 }
    )

  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }

  // Validate invite code if provided (check before DB to avoid partial work)
  let pendingInvite: Awaited<ReturnType<typeof findInvite>> | null = null
  if (inviteCode) {
    pendingInvite = await findInvite(inviteCode)
    if (!pendingInvite) {
      return NextResponse.json(
        { error: "Invalid or already used invite code" },
        { status: 422 }
      )
    }
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

    // Create user + consume invite atomically
    const user = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          email,
          phone,
          passwordHash,
          displayName,
          role: "user",
          status: "active",
          inviterUserId: pendingInvite?.inviterUserId ?? null,
        })
        .returning()

      if (pendingInvite) {
        const consumed = await consumeInvite(tx, pendingInvite.id, newUser.id)
        if (!consumed) {
          throw new Error("INVITE_ALREADY_CONSUMED")
        }
      }

      return newUser
    })

    const token = await setAuthCookie({ userId: user.id, role: user.role, sessionVersion: user.sessionVersion })

    return NextResponse.json(
      {
        user: {
          id: user.id,
          displayName: user.displayName,
          role: user.role,
        }, ...(nativeClient ? { token } : {}),
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === "INVITE_ALREADY_CONSUMED") {
      return NextResponse.json(
        { error: "Invalid or already used invite code" },
        { status: 422 }
      )
    }
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
    console.error(JSON.stringify({ event: "registration_failed", release: process.env.APP_RELEASE }))
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    )
  }
}

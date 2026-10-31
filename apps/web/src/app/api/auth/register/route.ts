import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { and, eq, isNull } from "drizzle-orm"
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
import { isRegistrationCode } from "@/lib/server/registration-code-policy"
import { consumeRegistrationCode } from "@/lib/server/registration-codes"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  const verificationCode = typeof body.verificationCode === "string" ? body.verificationCode.trim() : ""
  const password = String(body.password ?? "")
  const inviteCode = body.inviteCode ? String(body.inviteCode).trim().toUpperCase() : undefined

  if (!email || body.phone) {
    return NextResponse.json(
      { error: "请使用邮箱注册" },
      { status: 400 }
    )
  }

  // Validate email format
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) {
    return NextResponse.json(
      { error: "请输入有效邮箱" },
      { status: 400 }
    )
  }

  // Password requirements
  if (!isNewPasswordValid(password)) {
    return NextResponse.json(
      { error: "密码需要 8–128 位字符" },
      { status: 400 }
    )
  }

  // The public nickname must not disclose part of the verified email address.
  const displayName = `用户${randomUUID().slice(0, 6)}`

  if (!isDevAuthEnabled() && !isRegistrationCode(verificationCode)) {
    return NextResponse.json({ error: "请输入邮箱收到的 6 位验证码" }, { status: 400 })
  }

  if (isInviteRequired() && !inviteCode) {
    return NextResponse.json({ error: "请输入邀请码" }, { status: 403 })
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
          displayName,
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
        { error: "邀请码无效或已使用" },
        { status: 422 }
      )
    }
  }

  try {
    const { db } = await import("@/db/client")

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(isNull(users.deletedAt), eq(users.email, email)))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: "该邮箱已注册，请登录" },
        { status: 409 }
      )
    }

    // Email challenge, account and invitation commit together. Failed code
    // attempts must commit their counter rather than be rolled back by a throw.
    const user = await db.transaction(async (tx) => {
      if (!(await consumeRegistrationCode(tx, email, verificationCode))) return null
      const [newUser] = await tx
        .insert(users)
        .values({
          email,
          emailVerifiedAt: new Date(),
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

    if (!user) {
      return NextResponse.json({ error: "验证码错误或已失效，请重新获取" }, { status: 400 })
    }

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
        { error: "邀请码无效或已使用" },
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
        { error: "该邮箱已注册，请登录" },
        { status: 409 }
      )
    }
    console.error(JSON.stringify({ event: "registration_failed", release: process.env.APP_RELEASE }))
    return NextResponse.json(
      { error: "注册暂不可用，请稍后重试" },
      { status: 503 }
    )
  }
}

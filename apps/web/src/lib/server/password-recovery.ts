import { and, eq, gt, isNotNull, isNull, sql } from "drizzle-orm"
import { passwordResetTokens } from "@/db/schema/password-reset-tokens"
import { users } from "@/db/schema/users"
import { hashPassword } from "@/lib/server/auth"
import { sendMail } from "@/lib/server/mail"
import {
  createPasswordResetToken, hashPasswordResetToken, isNewPasswordValid,
  isPasswordResetToken, PASSWORD_RESET_TTL_MS, passwordResetUrl,
} from "@/lib/server/password-recovery-policy"

export async function issuePasswordReset(email: string): Promise<void> {
  const { db } = await import("@/db/client")
  const token = createPasswordResetToken()
  const tokenHash = hashPasswordResetToken(token)
  const url = passwordResetUrl(token)
  const user = await db.transaction(async (tx) => {
    // Serialize issuance/reset/deletion on the account, not only the token row.
    const [active] = await tx.select({ id: users.id, sessionVersion: users.sessionVersion })
      .from(users).where(and(eq(users.email, email), eq(users.status, "active"),
        isNull(users.deletedAt), isNotNull(users.passwordHash))).for("update")
    if (!active) return null
    const values = {
      tokenHash, sessionVersion: active.sessionVersion,
      expiresAt: sql`clock_timestamp() + ${PASSWORD_RESET_TTL_MS} * interval '1 millisecond'`,
      createdAt: sql`clock_timestamp()`,
    }
    await tx.insert(passwordResetTokens).values({ userId: active.id, ...values })
      .onConflictDoUpdate({ target: passwordResetTokens.userId, set: values })
    return active
  })
  if (!user) return
  try {
    await sendMail({ to: email, subject: "重置密码", text:
      `点击链接设置新密码：\n${url}\n\n链接 15 分钟内有效，仅可使用一次。\n如果不是你本人操作，请忽略此邮件。` })
  } catch {
    // Do not remove a newer link if another request replaced this one.
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash))
    throw new Error("Password reset delivery failed")
  }
}

/** Returns an email for a post-commit security notice, never for the API response. */
export async function consumePasswordReset(token: string, password: string): Promise<{ email: string } | null> {
  if (!isPasswordResetToken(token) || !isNewPasswordValid(password)) return null
  const { db } = await import("@/db/client")
  const tokenHash = hashPasswordResetToken(token)
  const [candidate] = await db.select({ userId: passwordResetTokens.userId })
    .from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenHash),
      gt(passwordResetTokens.expiresAt, sql`now()`)))
  if (!candidate) return null
  const passwordHash = await hashPassword(password)
  return db.transaction(async (tx) => {
    const [user] = await tx.select({ id: users.id, email: users.email, sessionVersion: users.sessionVersion })
      .from(users).where(and(eq(users.id, candidate.userId), eq(users.status, "active"),
        isNull(users.deletedAt), isNotNull(users.passwordHash))).for("update")
    if (!user?.email) return null
    const [valid] = await tx.select({ userId: passwordResetTokens.userId })
      .from(passwordResetTokens).where(and(eq(passwordResetTokens.userId, user.id),
        eq(passwordResetTokens.tokenHash, tokenHash),
        eq(passwordResetTokens.sessionVersion, user.sessionVersion),
        gt(passwordResetTokens.expiresAt, sql`clock_timestamp()`))).for("update")
    if (!valid) return null
    await tx.update(users).set({ passwordHash, sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date() }).where(eq(users.id, user.id))
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id))
    return { email: user.email }
  })
}

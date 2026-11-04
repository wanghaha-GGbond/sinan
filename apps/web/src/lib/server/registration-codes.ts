import { randomUUID, timingSafeEqual } from "node:crypto"
import { and, eq, gt, isNotNull, lte, sql } from "drizzle-orm"
import { registrationCodes } from "@/db/schema/registration-codes"
import { buildVerificationCodeEmail, sendMail, type MailMessage } from "@/lib/server/mail"
import { createRegistrationCode, registrationCodeHash, registrationEmailHash,
  REGISTRATION_CODE_MAX_ATTEMPTS, REGISTRATION_CODE_TTL_MS } from "./registration-code-policy"

type Transaction = Parameters<Parameters<typeof import("@/db/client").db.transaction>[0]>[0]

export async function issueRegistrationCode(email: string, deliver: (message: MailMessage) => Promise<void> = sendMail) {
  const { db } = await import("@/db/client")
  const code = createRegistrationCode()
  const id = randomUUID()
  const emailHash = registrationEmailHash(email)
  const codeHash = registrationCodeHash(email, id, code)
  await db.delete(registrationCodes).where(lte(registrationCodes.expiresAt, sql`now()`))
  const values = { id, codeHash, attempts: 0, deliveredAt: null,
    expiresAt: sql`clock_timestamp() + ${REGISTRATION_CODE_TTL_MS} * interval '1 millisecond'`,
    createdAt: sql`clock_timestamp()` }
  await db.insert(registrationCodes).values({ emailHash, ...values })
    .onConflictDoUpdate({ target: registrationCodes.emailHash, set: values })
  try {
    await deliver({ to: email, subject: "验证邮箱", text: buildVerificationCodeEmail(code) })
    await db.update(registrationCodes).set({ deliveredAt: new Date() })
      .where(and(eq(registrationCodes.emailHash, emailHash), eq(registrationCodes.id, id)))
  } catch {
    await db.delete(registrationCodes).where(and(eq(registrationCodes.emailHash, emailHash), eq(registrationCodes.id, id)))
    throw new Error("Registration code delivery failed")
  }
}

// Must run in the SAME transaction as user creation and invite consumption.
// Returning false commits a failed-attempt increment; throwing would undo it.
export async function consumeRegistrationCode(tx: Transaction, email: string, code: string): Promise<boolean> {
  const emailHash = registrationEmailHash(email)
  const [challenge] = await tx.select().from(registrationCodes).where(and(
    eq(registrationCodes.emailHash, emailHash), isNotNull(registrationCodes.deliveredAt),
    gt(registrationCodes.expiresAt, sql`clock_timestamp()`),
  )).for("update")
  if (!challenge || challenge.attempts >= REGISTRATION_CODE_MAX_ATTEMPTS) return false
  const expected = Buffer.from(challenge.codeHash, "hex")
  const actual = Buffer.from(registrationCodeHash(email, challenge.id, code), "hex")
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await tx.update(registrationCodes).set({ attempts: challenge.attempts + 1 })
      .where(eq(registrationCodes.emailHash, emailHash))
    return false
  }
  const [consumed] = await tx.delete(registrationCodes).where(and(
    eq(registrationCodes.emailHash, emailHash), eq(registrationCodes.id, challenge.id),
    gt(registrationCodes.expiresAt, sql`clock_timestamp()`),
  )).returning({ id: registrationCodes.id })
  return Boolean(consumed)
}

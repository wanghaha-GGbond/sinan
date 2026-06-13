/**
 * Verification business logic.
 *
 * All state transitions that affect users.trust_level live here and execute
 * inside a single transaction — the atomic pairing of verification status
 * update + trust level change is the load-bearing guarantee of the entire
 * identity system.
 */

import crypto from "node:crypto"

// ---------------------------------------------------------------------------
// Verification code helpers
// ---------------------------------------------------------------------------

const CODE_LENGTH = 6
const CODE_EXPIRY_MINUTES = 15
const MAX_ATTEMPTS = 5

/** Generate a random 6-digit numeric code. */
export function generateVerificationCode(): string {
  // Use crypto.randomInt for uniform distribution, no modulo bias
  return String(crypto.randomInt(0, 1_000_000)).padStart(CODE_LENGTH, "0")
}

/** Hash a code for storage (SHA-256, hex). Never store plaintext codes. */
export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex")
}

export function codeExpiresAt(): Date {
  return new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000)
}

// ---------------------------------------------------------------------------
// Trust level mapping
// ---------------------------------------------------------------------------

const TRUST_LEVEL_BY_PROOF: Record<string, number> = {
  work_email: 1,
  business_document: 2,
  salary_proof: 3,
}

export function grantedTrustLevel(proofType: string): number {
  return TRUST_LEVEL_BY_PROOF[proofType] ?? 1
}

// ---------------------------------------------------------------------------
// Approve / revoke — the two atomic state transitions
// ---------------------------------------------------------------------------

/**
 * Approve a company verification.
 *
 * Single transaction:
 *   1. Mark verification approved + set reviewer + grantedTrustLevel
 *   2. Raise users.trust_level = GREATEST(trust_level, granted)
 *   3. Increment companies.verified_identity_count
 *
 * Returns the granted trust level, or throws on conflict / not-found.
 */
export async function approveVerification(
  verificationId: string,
  moderatorUserId: string
): Promise<{ grantedTrustLevel: number }> {
  const { db } = await import("@/db/client")
  const { companyVerifications } = await import("@/db/schema/company-verifications")
  const { users } = await import("@/db/schema/users")
  const { companies } = await import("@/db/schema/companies")
  const { moderationEvents } = await import("@/db/schema/moderation-events")
  const { and, eq, inArray, sql } = await import("drizzle-orm")

  let applicantUserId: string | undefined

  const txResult = await db.transaction(async (tx) => {
    const [verification] = await tx
      .select({
        id: companyVerifications.id,
        applicantUserId: companyVerifications.applicantUserId,
        companyId: companyVerifications.companyId,
        proofType: companyVerifications.proofType,
        status: companyVerifications.status,
      })
      .from(companyVerifications)
      .where(eq(companyVerifications.id, verificationId))
      .limit(1)

    if (!verification) throw new Error("Verification not found")
    if (verification.status === "approved") {
      throw new Error("Verification already approved")
    }
    if (verification.status === "revoked") {
      throw new Error("Cannot approve a revoked verification")
    }

    const granted = grantedTrustLevel(verification.proofType)
    applicantUserId = verification.applicantUserId

    const [approved] = await tx
      .update(companyVerifications)
      .set({
        status: "approved",
        reviewedByUserId: moderatorUserId,
        reviewedAt: new Date(),
        grantedTrustLevel: granted,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(companyVerifications.id, verificationId),
          inArray(companyVerifications.status, ["submitted", "reviewing"])
        )
      )
      .returning({ id: companyVerifications.id })

    if (!approved) {
      throw new Error("Verification state changed")
    }

    await tx.insert(moderationEvents).values({
      entityType: "company_verification",
      entityId: verificationId,
      actorUserId: moderatorUserId,
      actorRole: "moderator",
      fromStatus: verification.status,
      toStatus: "approved",
    })

    await tx
      .update(users)
      .set({
        trustLevel: sql`GREATEST(${users.trustLevel}, ${granted})`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, verification.applicantUserId))

    await tx
      .update(companies)
      .set({
        verifiedIdentityCount: sql`${companies.verifiedIdentityCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, verification.companyId))

    return { grantedTrustLevel: granted }
  })

  // Post-transaction side effects (non-critical — failure must not roll back the approval)
  if (applicantUserId) {
    try {
      const { issueInitialInvites, returnInviteIfEligible, TRUST_LEVEL_TO_EARN_INVITES, RETURN_QUOTA_AT_TRUST } = await import("@/lib/server/invites")
      const [updated] = await db.select({ trustLevel: users.trustLevel }).from(users).where(eq(users.id, applicantUserId)).limit(1)
      const tl = updated?.trustLevel ?? 0
      if (tl >= TRUST_LEVEL_TO_EARN_INVITES) await issueInitialInvites(applicantUserId)
      if (tl >= RETURN_QUOTA_AT_TRUST) await returnInviteIfEligible(applicantUserId)
    } catch {
      // intentionally swallowed
    }
  }

  return txResult
}

/**
 * Reject a verification (human review, not a code mismatch).
 */
export async function rejectVerification(
  verificationId: string,
  moderatorUserId: string,
  rejectReason: string
): Promise<void> {
  const { db } = await import("@/db/client")
  const { companyVerifications } = await import("@/db/schema/company-verifications")
  const { moderationEvents } = await import("@/db/schema/moderation-events")
  const { eq } = await import("drizzle-orm")

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(companyVerifications)
      .set({
        status: "rejected",
        reviewedByUserId: moderatorUserId,
        reviewedAt: new Date(),
        rejectReason: rejectReason.trim().slice(0, 500) || null,
        updatedAt: new Date(),
      })
      .where(eq(companyVerifications.id, verificationId))
      .returning({ id: companyVerifications.id })
    if (!updated) throw new Error("Verification not found")
    await tx.insert(moderationEvents).values({
      entityType: "company_verification",
      entityId: verificationId,
      actorUserId: moderatorUserId,
      actorRole: "moderator",
      toStatus: "rejected",
      reason: rejectReason,
    })
  })
}

/**
 * Revoke an approved verification (e.g. discovered fraud, user left company).
 *
 * Recalculates the user's trust_level from their remaining valid verifications.
 * Does NOT retroactively modify historical display labels (per spec: labels show
 * the level at time of posting, annotated "已失效").
 */
export async function revokeVerification(
  verificationId: string,
  moderatorUserId: string,
  rejectReason: string
): Promise<void> {
  const { db } = await import("@/db/client")
  const { companyVerifications } = await import("@/db/schema/company-verifications")
  const { users } = await import("@/db/schema/users")
  const { companies } = await import("@/db/schema/companies")
  const { moderationEvents } = await import("@/db/schema/moderation-events")
  const { eq, and, max, sql } = await import("drizzle-orm")

  await db.transaction(async (tx) => {
    const [verification] = await tx
      .select({
        applicantUserId: companyVerifications.applicantUserId,
        companyId: companyVerifications.companyId,
        status: companyVerifications.status,
      })
      .from(companyVerifications)
      .where(eq(companyVerifications.id, verificationId))
      .limit(1)

    if (!verification) throw new Error("Verification not found")
    if (verification.status !== "approved") {
      throw new Error("Only approved verifications can be revoked")
    }

    await tx
      .update(companyVerifications)
      .set({
        status: "revoked",
        reviewedByUserId: moderatorUserId,
        reviewedAt: new Date(),
        rejectReason: rejectReason.trim().slice(0, 500) || null,
        updatedAt: new Date(),
      })
      .where(eq(companyVerifications.id, verificationId))

    await tx.insert(moderationEvents).values({
      entityType: "company_verification",
      entityId: verificationId,
      actorUserId: moderatorUserId,
      actorRole: "moderator",
      fromStatus: "approved",
      toStatus: "revoked",
      reason: rejectReason,
    })

    await tx
      .update(companies)
      .set({
        verifiedIdentityCount: sql`GREATEST(0, ${companies.verifiedIdentityCount} - 1)`,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, verification.companyId))

    // Recalculate trust level from remaining valid verifications
    const [result] = await tx
      .select({ maxLevel: max(companyVerifications.grantedTrustLevel) })
      .from(companyVerifications)
      .where(
        and(
          eq(companyVerifications.applicantUserId, verification.applicantUserId),
          eq(companyVerifications.status, "approved")
        )
      )

    const newTrustLevel = result?.maxLevel ?? 0

    await tx
      .update(users)
      .set({ trustLevel: newTrustLevel, updatedAt: new Date() })
      .where(eq(users.id, verification.applicantUserId))
  })
}

// ---------------------------------------------------------------------------
// L1 code flow helpers
// ---------------------------------------------------------------------------

export { MAX_ATTEMPTS }

/**
 * Issue a new verification code for an L1 (work_email) verification.
 * Invalidates any existing unconsumed codes for the same verification.
 */
export async function issueVerificationCode(
  verificationId: string
): Promise<string> {
  const { db } = await import("@/db/client")
  const { emailVerificationCodes } = await import("@/db/schema/email-verification-codes")
  const { eq } = await import("drizzle-orm")

  const code = generateVerificationCode()
  const codeHash = hashCode(code)

  // Soft-expire previous codes by setting consumed_at
  await db
    .update(emailVerificationCodes)
    .set({ consumedAt: new Date() })
    .where(
      eq(emailVerificationCodes.verificationId, verificationId)
    )

  await db.insert(emailVerificationCodes).values({
    verificationId,
    codeHash,
    expiresAt: codeExpiresAt(),
    attemptCount: 0,
    consumedAt: null,
  })

  return code
}

/**
 * Validate a submitted code against the latest active code for a verification.
 * On success, atomically consumes the code + approves the verification.
 *
 * Returns "ok" | "invalid" | "expired" | "too_many_attempts" | "not_found"
 */
export async function confirmVerificationCode(
  verificationId: string,
  submittedCode: string
): Promise<"ok" | "invalid" | "expired" | "too_many_attempts" | "not_found"> {
  const { db } = await import("@/db/client")
  const { emailVerificationCodes } = await import("@/db/schema/email-verification-codes")
  const { companyVerifications } = await import("@/db/schema/company-verifications")
  const { users } = await import("@/db/schema/users")
  const { companies } = await import("@/db/schema/companies")
  const { eq, and, isNull, desc, sql } = await import("drizzle-orm")

  const now = new Date()

  const [codeRow] = await db
    .select()
    .from(emailVerificationCodes)
    .where(
      and(
        eq(emailVerificationCodes.verificationId, verificationId),
        isNull(emailVerificationCodes.consumedAt)
      )
    )
    .orderBy(desc(emailVerificationCodes.createdAt))
    .limit(1)

  if (!codeRow) return "not_found"
  if (codeRow.attemptCount >= MAX_ATTEMPTS) return "too_many_attempts"
  if (now > codeRow.expiresAt) return "expired"

  const submittedHash = hashCode(submittedCode)
  if (submittedHash !== codeRow.codeHash) {
    await db
      .update(emailVerificationCodes)
      .set({ attemptCount: codeRow.attemptCount + 1 })
      .where(eq(emailVerificationCodes.id, codeRow.id))
    return "invalid"
  }

  // Code matches — consume it + approve verification in one transaction
  const confirmedApplicantId = await db.transaction(async (tx) => {
    const [consumed] = await tx
      .update(emailVerificationCodes)
      .set({ consumedAt: now })
      .where(
        and(
          eq(emailVerificationCodes.id, codeRow.id),
          isNull(emailVerificationCodes.consumedAt)
        )
      )
      .returning({ id: emailVerificationCodes.id })
    if (!consumed) return null

    const [verification] = await tx
      .select({
        applicantUserId: companyVerifications.applicantUserId,
        companyId: companyVerifications.companyId,
        proofType: companyVerifications.proofType,
        status: companyVerifications.status,
      })
      .from(companyVerifications)
      .where(eq(companyVerifications.id, verificationId))
      .limit(1)

    if (
      !verification ||
      verification.proofType !== "work_email" ||
      verification.status !== "submitted"
    ) {
      throw new Error("Verification is not eligible for code confirmation")
    }

    const granted = grantedTrustLevel(verification.proofType)

    const [approved] = await tx
      .update(companyVerifications)
      .set({
        status: "approved",
        reviewedAt: now,
        grantedTrustLevel: granted,
        updatedAt: now,
      })
      .where(
        and(
          eq(companyVerifications.id, verificationId),
          eq(companyVerifications.status, "submitted"),
          eq(companyVerifications.proofType, "work_email")
        )
      )
      .returning({ id: companyVerifications.id })
    if (!approved) {
      throw new Error("Verification state changed")
    }

    await tx
      .update(users)
      .set({
        trustLevel: sql`GREATEST(${users.trustLevel}, ${granted})`,
        updatedAt: now,
      })
      .where(eq(users.id, verification.applicantUserId))

    await tx
      .update(companies)
      .set({
        verifiedIdentityCount: sql`${companies.verifiedIdentityCount} + 1`,
        updatedAt: now,
      })
      .where(eq(companies.id, verification.companyId))

    return verification.applicantUserId
  })

  if (!confirmedApplicantId) return "not_found"

  // Post-transaction invite side effects
  if (confirmedApplicantId) {
    try {
      const { issueInitialInvites, returnInviteIfEligible, TRUST_LEVEL_TO_EARN_INVITES, RETURN_QUOTA_AT_TRUST } = await import("@/lib/server/invites")
      const [updated] = await db.select({ trustLevel: users.trustLevel }).from(users).where(eq(users.id, confirmedApplicantId)).limit(1)
      const tl = updated?.trustLevel ?? 0
      if (tl >= TRUST_LEVEL_TO_EARN_INVITES) await issueInitialInvites(confirmedApplicantId)
      if (tl >= RETURN_QUOTA_AT_TRUST) await returnInviteIfEligible(confirmedApplicantId)
    } catch {
      // intentionally swallowed
    }
  }

  return "ok"
}

/**
 * Invite system business logic.
 *
 * Quota rules (single source of truth):
 *   - Users earn their first 3 invites when trustLevel reaches 1.
 *   - When an invited user reaches trustLevel 2, the inviter gets +1 (capped at 6).
 *   - INVITE_REQUIRED env flag controls whether invites are enforced at registration.
 */

import crypto from "node:crypto"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const INITIAL_QUOTA = 3
export const RETURN_QUOTA_AT_TRUST = 2
export const MAX_QUOTA = 6
export const TRUST_LEVEL_TO_EARN_INVITES = 1

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

/** Generate an 8-character invite code (no ambiguous chars: 0/O, 1/I/l). */
export function generateInviteCode(): string {
  const bytes = crypto.randomBytes(8)
  return Array.from(bytes)
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join("")
}

// ---------------------------------------------------------------------------
// Quota management
// ---------------------------------------------------------------------------

/**
 * Issue the initial 3 invites to a user who just reached trustLevel 1.
 * Safe to call multiple times — only issues if user has no invites yet.
 */
export async function issueInitialInvites(userId: string): Promise<void> {
  const { db } = await import("@/db/client")
  const { invites } = await import("@/db/schema/invites")
  const { eq, count, sql } = await import("drizzle-orm")

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`)
    const [{ total }] = await tx
      .select({ total: count() })
      .from(invites)
      .where(eq(invites.inviterUserId, userId))

    if (Number(total) > 0) return

    await tx.insert(invites).values(
      Array.from({ length: INITIAL_QUOTA }, () => ({
        code: generateInviteCode(),
        inviterUserId: userId,
      }))
    )
  })
}

/**
 * Return 1 invite to an inviter when their invitee reaches trustLevel 2.
 * Called from the approveVerification transaction's aftermath.
 *
 * Only runs if:
 *   - The invitee was invited by someone (inviterUserId set)
 *   - The inviter's used invites < MAX_QUOTA
 */
export async function returnInviteIfEligible(inviteeUserId: string): Promise<void> {
  const { db } = await import("@/db/client")
  const { invites } = await import("@/db/schema/invites")
  const { users } = await import("@/db/schema/users")
  const { eq, and, count, isNull, sql } = await import("drizzle-orm")

  const [invitee] = await db
    .select({ inviterUserId: users.inviterUserId, trustLevel: users.trustLevel })
    .from(users)
    .where(eq(users.id, inviteeUserId))
    .limit(1)

  if (!invitee?.inviterUserId) return
  if ((invitee.trustLevel ?? 0) < RETURN_QUOTA_AT_TRUST) return

  const inviterId = invitee.inviterUserId
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${inviterId}))`)

    const [sourceInvite] = await tx
      .select({ id: invites.id })
      .from(invites)
      .where(
        and(
          eq(invites.invitedUserId, inviteeUserId),
          eq(invites.status, "used"),
          isNull(invites.quotaReturnedAt)
        )
      )
      .limit(1)
    if (!sourceInvite) return

    const [{ total }] = await tx
      .select({ total: count() })
      .from(invites)
      .where(eq(invites.inviterUserId, inviterId))

    if (Number(total) >= MAX_QUOTA) return

    const returnedAt = new Date()
    const [claimed] = await tx
      .update(invites)
      .set({ quotaReturnedAt: returnedAt })
      .where(and(eq(invites.id, sourceInvite.id), isNull(invites.quotaReturnedAt)))
      .returning({ id: invites.id })
    if (!claimed) return

    await tx.insert(invites).values({
      code: generateInviteCode(),
      inviterUserId: inviterId,
    })
  })
}

// ---------------------------------------------------------------------------
// Registration flow helpers
// ---------------------------------------------------------------------------

/**
 * Look up an invite code and return the invite row, or null.
 */
export async function findInvite(code: string) {
  const { db } = await import("@/db/client")
  const { invites } = await import("@/db/schema/invites")
  const { eq, and } = await import("drizzle-orm")

  const [row] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.code, code.toUpperCase()), eq(invites.status, "unused")))
    .limit(1)

  return row ?? null
}

/**
 * Consume an invite code + link invitedUser.
 * Pass the drizzle db instance (or a transaction tx).
 */
export async function consumeInvite(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  inviteId: string,
  invitedUserId: string
): Promise<boolean> {
  const { invites } = await import("@/db/schema/invites")
  const { eq, and } = await import("drizzle-orm")

  const [consumed] = await db
    .update(invites)
    .set({ status: "used", invitedUserId, usedAt: new Date() })
    .where(and(eq(invites.id, inviteId), eq(invites.status, "unused")))
    .returning({ id: invites.id })

  return Boolean(consumed)
}

// ---------------------------------------------------------------------------
// Public profile helpers
// ---------------------------------------------------------------------------

/**
 * Get invite stats for a user's /me page.
 */
export async function getInviteStats(userId: string) {
  const { db } = await import("@/db/client")
  const { invites } = await import("@/db/schema/invites")
  const { eq, and, count } = await import("drizzle-orm")

  const [all, used] = await Promise.all([
    db
      .select({ total: count() })
      .from(invites)
      .where(eq(invites.inviterUserId, userId)),
    db
      .select({ total: count() })
      .from(invites)
      .where(and(eq(invites.inviterUserId, userId), eq(invites.status, "used"))),
  ])

  const unusedRows = await db
    .select({
      id: invites.id,
      code: invites.code,
      status: invites.status,
      createdAt: invites.createdAt,
    })
    .from(invites)
    .where(and(eq(invites.inviterUserId, userId), eq(invites.status, "unused")))

  return {
    total: Number(all[0]?.total ?? 0),
    used: Number(used[0]?.total ?? 0),
    unused: unusedRows,
  }
}

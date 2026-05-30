/**
 * Server-side anonymous profile utilities.
 *
 * IMPORTANT: This file must NOT be imported by client components.
 * It provides server-only logic for anonymous identity management.
 *
 * Public API boundaries:
 *   - Returned to everyone: id, displayLabel, avatarSeed
 *   - NEVER returned: userId, fingerprintHash
 */
import { and, eq, isNull } from "drizzle-orm"
import type { InferSelectModel } from "drizzle-orm"
import type { anonymousProfiles } from "@/db/schema/anonymous-profiles"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnonymousProfileScope = {
  scopeType: "global" | "company" | "review" | "discussion"
  scopeId?: string
}

export type AnonymousProfilePublicView = {
  id: string
  displayLabel: string
  avatarSeed: string | null
}

// ---------------------------------------------------------------------------
// Display label builder
// ---------------------------------------------------------------------------

const ROLE_LABEL_MAP: Record<string, string> = {
  job_seeker: "匿名求职者",
  current_employee: "在职员工",
  former_employee: "匿名过来人",
  interviewee: "匿名面试者",
  intern: "匿名实习生",
  contractor: "匿名外包",
}

export function buildAnonymousDisplayLabel(role?: string): string {
  if (role && role in ROLE_LABEL_MAP) {
    return ROLE_LABEL_MAP[role]
  }
  return "匿名用户"
}

// ---------------------------------------------------------------------------
// Avatar seed
// ---------------------------------------------------------------------------

export function buildAvatarSeed(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(6, "0")
}

// ---------------------------------------------------------------------------
// Anonymous profile lookup / creation
// ---------------------------------------------------------------------------

/**
 * Get or create an anonymous profile for a user within a given scope.
 *
 * MVP strategy: scopeType = "company", one stable anonymous profile
 * per user per company. This gives continuity within a company
 * (readers see the same "匿名过来人" across multiple posts) while
 * preventing cross-company correlation.
 */
export async function getOrCreateAnonymousProfile(params: {
  userId?: string
  fingerprintHash?: string
  scope: AnonymousProfileScope
  role?: string
}): Promise<AnonymousProfilePublicView> {
  if (!params.userId && !params.fingerprintHash) {
    // No identity at all — can't create a profile
    throw new Error("Either userId or fingerprintHash is required")
  }

  try {
    const { db } = await import("@/db/client")
    const { anonymousProfiles } = await import("@/db/schema/anonymous-profiles")

    // Try to find existing profile
    const conditions: ReturnType<typeof and>[] = [
      eq(anonymousProfiles.scopeType, params.scope.scopeType),
      isNull(anonymousProfiles.deletedAt),
    ]

    if (params.scope.scopeId) {
      conditions.push(eq(anonymousProfiles.scopeId, params.scope.scopeId))
    }

    if (params.userId) {
      conditions.push(eq(anonymousProfiles.userId, params.userId))
    } else if (params.fingerprintHash) {
      conditions.push(
        eq(anonymousProfiles.fingerprintHash, params.fingerprintHash)
      )
    }

    const [existing] = await db
      .select()
      .from(anonymousProfiles)
      .where(and(...conditions))
      .limit(1)

    if (existing) {
      // Update lastUsedAt
      await db
        .update(anonymousProfiles)
        .set({ lastUsedAt: new Date() })
        .where(eq(anonymousProfiles.id, existing.id))

      return toAnonymousProfilePublicView(existing)
    }

    // Create a new anonymous profile
    const displayLabel = buildAnonymousDisplayLabel(params.role)
    const avatarSeed = buildAvatarSeed(
      `${params.userId ?? params.fingerprintHash}-${params.scope.scopeType}-${params.scope.scopeId ?? ""}`
    )

    const [row] = await db
      .insert(anonymousProfiles)
      .values({
        userId: params.userId,
        fingerprintHash: params.fingerprintHash,
        scopeType: params.scope.scopeType,
        scopeId: params.scope.scopeId,
        displayLabel,
        avatarSeed,
        isCurrent: true,
      })
      .returning()

    return toAnonymousProfilePublicView(row)
  } catch {
    // Fallback: return a generated profile without DB
    return {
      id: crypto.randomUUID(),
      displayLabel: buildAnonymousDisplayLabel(params.role),
      avatarSeed: buildAvatarSeed(
        `${params.userId ?? params.fingerprintHash ?? "anon"}-${Date.now()}`
      ),
    }
  }
}

// ---------------------------------------------------------------------------
// Public view sanitization
// ---------------------------------------------------------------------------

export function toAnonymousProfilePublicView(
  row: InferSelectModel<typeof anonymousProfiles>
): AnonymousProfilePublicView {
  return {
    id: row.id,
    displayLabel: row.displayLabel,
    avatarSeed: row.avatarSeed,
  }
}

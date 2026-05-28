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
import type { InferSelectModel } from "drizzle-orm"
import type { anonymousProfiles } from "@/db/schema/anonymous-profiles"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnonymousProfileScope = {
  scopeType: "global" | "company" | "review" | "discussion"
  scopeId?: string
}

/** The subset of an anonymous profile safe to expose in public API responses. */
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

/**
 * Build a human-readable anonymous display label from an author role.
 * Falls back to "匿名用户" when no role is provided or the role is unknown.
 */
export function buildAnonymousDisplayLabel(role?: string): string {
  if (role && role in ROLE_LABEL_MAP) {
    return ROLE_LABEL_MAP[role]
  }
  return "匿名用户"
}

// ---------------------------------------------------------------------------
// Avatar seed
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic avatar seed from an input string.
 * Used to produce consistent anonymous avatars without exposing identity.
 */
export function buildAvatarSeed(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(6, "0")
}

// ---------------------------------------------------------------------------
// Anonymous profile lookup / creation
// ---------------------------------------------------------------------------

/**
 * Get or create an anonymous profile for a user or device fingerprint
 * within a given scope.
 *
 * TODO(Phase 3): Wire up real DB queries when API routes exist.
 * The db client import must be avoided until server endpoints are ready,
 * because importing src/db/client.ts at build time requires DATABASE_URL.
 *
 * When implemented:
 * 1. Query anonymous_profiles for matching (userId/fingerprintHash, scopeType, scopeId)
 * 2. If not found, INSERT a new anonymous_profile with a generated display_label
 * 3. Return only the public view (id, displayLabel, avatarSeed)
 * 4. Never return userId, fingerprintHash, or any other internal field
 */
export async function getOrCreateAnonymousProfile(
  params: {
    userId?: string
    fingerprintHash?: string
    scope: AnonymousProfileScope
    role?: string
  }
): Promise<AnonymousProfilePublicView> {
  void params // placeholder — will be used in Phase 3 when DB is wired
  throw new Error(
    "getOrCreateAnonymousProfile is not yet implemented. " +
    "It will be wired up in Phase 3 when API routes are created."
  )
}

// ---------------------------------------------------------------------------
// Public view sanitization
// ---------------------------------------------------------------------------

/**
 * Strip internal fields from an anonymous profile row before returning
 * to public API consumers. This is the last line of defense — even if a
 * query accidentally selects sensitive columns, this ensures they are
 * never serialized into a response body.
 */
export function toAnonymousProfilePublicView(
  row: InferSelectModel<typeof anonymousProfiles>
): AnonymousProfilePublicView {
  return {
    id: row.id,
    displayLabel: row.displayLabel,
    avatarSeed: row.avatarSeed,
  }
}

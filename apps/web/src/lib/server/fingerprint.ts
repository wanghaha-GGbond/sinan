import crypto from "node:crypto"

const MAX_FINGERPRINT_LENGTH = 128

/**
 * Client fingerprints are only an abuse-control hint, never an identity
 * credential. Normalize and validate them before they reach the database.
 */
export function normalizeClientFingerprint(value: string | null): string | null {
  if (!value) return null
  const normalized = value.trim()
  if (normalized.length === 0 || normalized.length > MAX_FINGERPRINT_LENGTH) {
    return null
  }
  return normalized
}

/**
 * Store a keyed digest rather than the client-provided identifier itself.
 * This preserves same-device deduplication without keeping a replayable raw
 * fingerprint in the database.
 */
export function hashClientFingerprint(value: string): string {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.NEXT_PUBLIC_APP_ENV === "production"
  const secret = process.env.AUTH_SECRET
  if (isProduction && !secret) {
    throw new Error("AUTH_SECRET is required to hash client fingerprints in production")
  }
  return crypto
    .createHmac("sha256", secret ?? "sinan-dev-secret-change-in-production")
    .update(value)
    .digest("hex")
}

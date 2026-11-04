import { createHash, createHmac, randomInt } from "node:crypto"

export const REGISTRATION_CODE_TTL_MS = 15 * 60 * 1000
export const REGISTRATION_CODE_MAX_ATTEMPTS = 5
export const REGISTRATION_CODE_RESEND_SECONDS = 60

export function normalizeRegistrationEmail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const email = value.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export function isRegistrationCode(value: unknown): value is string {
  return typeof value === "string" && /^\d{6}$/.test(value)
}

export function createRegistrationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0")
}

export function registrationEmailHash(email: string) {
  return createHash("sha256").update(email).digest("hex")
}

export function registrationCodeHash(email: string, id: string, code: string) {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) throw new Error("Registration secret is not configured")
  // A database-only leak cannot brute-force the six-digit codes without the key.
  return createHmac("sha256", secret).update(JSON.stringify([email, id, code])).digest("hex")
}

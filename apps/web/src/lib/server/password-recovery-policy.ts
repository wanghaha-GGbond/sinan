import crypto from "node:crypto"

export const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000
export const PASSWORD_RESET_ACCEPTED = "如果该邮箱已注册，会收到重置链接。"

export function createPasswordResetToken() {
  return crypto.randomBytes(32).toString("hex")
}

export function isPasswordResetToken(value: unknown): value is string {
  return typeof value === "string" && value.length === 64 && /^[a-f0-9]{64}$/.test(value)
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export function isNewPasswordValid(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 128
}

export function isCurrentSession(tokenVersion: number | undefined, currentVersion: number) {
  // Existing JWTs have no version. They survive rollout, but not a password reset.
  return (tokenVersion ?? 0) === currentVersion
}

export function passwordResetUrl(token: string, appUrl = process.env.NEXT_PUBLIC_APP_URL) {
  if (!appUrl || !isPasswordResetToken(token)) throw new Error("Invalid recovery configuration")
  const url = new URL(appUrl)
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Recovery requires a trusted HTTPS app URL")
  }
  url.pathname = "/reset-password"
  url.search = ""
  // Fragments do not reach HTTP access logs or Referer headers.
  url.hash = `token=${token}`
  return url.toString()
}

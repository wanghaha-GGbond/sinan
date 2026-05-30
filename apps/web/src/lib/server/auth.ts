/**
 * Server-side authentication utilities.
 *
 * Uses JWT stored in httpOnly cookies — the token is never exposed to
 * client-side JavaScript, preventing XSS-based token theft.
 *
 * Password hashing uses Node's built-in crypto.scrypt (no extra dependency).
 * JWT signing/verification uses jose (Edge-compatible, modern).
 */
import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import crypto from "node:crypto"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const AUTH_SECRET = process.env.AUTH_SECRET
const TOKEN_COOKIE = "auth_token"
const TOKEN_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// In production, refuse to start without a proper secret — silently falling back
// to a hardcoded dev key would allow anyone to forge valid JWTs.
if (!AUTH_SECRET || AUTH_SECRET === "sinan-dev-secret-change-in-production") {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET environment variable is required in production. " +
      "Generate one with: openssl rand -hex 32"
    )
  }
  // Dev fallback: only used when NODE_ENV is not "production"
}

function getSecretKey() {
  return new TextEncoder().encode(
    AUTH_SECRET ?? "sinan-dev-secret-change-in-production"
  )
}

// ---------------------------------------------------------------------------
// Password hashing (scrypt)
// ---------------------------------------------------------------------------

const KEY_LENGTH = 64
const SALT_LENGTH = 16

/**
 * Hash a plaintext password using scrypt with a random salt.
 * Returns "saltHex:hashHex" for storage in the password_hash column.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH)
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return reject(err)
      resolve(`${salt.toString("hex")}:${derivedKey.toString("hex")}`)
    })
  })
}

/**
 * Verify a plaintext password against a stored "saltHex:hashHex" string.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":")
  if (!saltHex || !hashHex) return false

  const salt = Buffer.from(saltHex, "hex")
  return new Promise((resolve) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return resolve(false)
      resolve(crypto.timingSafeEqual(
        Buffer.from(hashHex, "hex"),
        derivedKey
      ))
    })
  })
}

// ---------------------------------------------------------------------------
// JWT token handling
// ---------------------------------------------------------------------------

export type AuthUser = {
  userId: string
  role: string
}

export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ sub: user.userId, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(getSecretKey())
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return {
      userId: payload.sub as string,
      role: (payload.role as string) ?? "user",
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export async function setAuthCookie(user: AuthUser): Promise<string> {
  const token = await signToken(user)
  const jar = await cookies()
  jar.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  })
  return token
}

export async function clearAuthCookie(): Promise<void> {
  const jar = await cookies()
  jar.delete(TOKEN_COOKIE)
}

// ---------------------------------------------------------------------------
// Request-level auth extraction
// ---------------------------------------------------------------------------

/**
 * Extract the current user from an incoming request's auth cookie.
 * Returns null if no valid token is present.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const jar = await cookies()
  const token = jar.get(TOKEN_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

/**
 * Require authentication. Returns the user or throws a Response that
 * the caller should return directly.
 */
export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) {
    throw new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    )
  }
  return user
}

/**
 * Require moderator or admin role.
 */
export async function requireModerator(): Promise<AuthUser> {
  const user = await requireAuthUser()
  if (user.role !== "moderator" && user.role !== "admin") {
    throw new Response(
      JSON.stringify({ error: "Moderator privileges required" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    )
  }
  return user
}

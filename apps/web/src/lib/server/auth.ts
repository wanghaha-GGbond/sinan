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

// AUTH_SECRET is read lazily. Previously this module threw at import time
// if AUTH_SECRET was unset in production, which broke `next build` on
// any environment that hadn't set env vars yet (CI without a secret
// vault, fresh clones, local dev). The fix: the throw now fires at the
// first request that needs to sign or verify a token, not at module
// load. The check still fires for non-test production traffic.
const TOKEN_COOKIE = "auth_token"
const TOKEN_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function resolveSecret(): string {
  const fromEnv = process.env.AUTH_SECRET
  if (fromEnv && fromEnv !== "sinan-dev-secret-change-in-production") {
    return fromEnv
  }
  // Production needs a real secret. The dev fallback below is a
  // well-known string that fails any real password attempt because
  // user records were never hashed against it.
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.NEXT_PUBLIC_APP_ENV === "production"
  if (isProduction) {
    throw new Error(
      "AUTH_SECRET environment variable is required in production. " +
        "Generate one with: openssl rand -hex 32",
    )
  }
  return "sinan-dev-secret-change-in-production"
}

function getSecretKey() {
  return new TextEncoder().encode(resolveSecret())
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

  // Defensive: if either part isn't valid hex, or lengths don't
  // match the expected scrypt output, return false without
  // calling timingSafeEqual. The latter throws on length
  // mismatch (a runtime crash on bad data) and leaks timing
  // info even before the comparison runs.
  if (saltHex.length !== SALT_LENGTH * 2) return false
  if (hashHex.length !== KEY_LENGTH * 2) return false
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return false

  const salt = Buffer.from(saltHex, "hex")
  const expected = Buffer.from(hashHex, "hex")
  return new Promise((resolve) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return resolve(false)
      // Lengths now guaranteed equal, so timingSafeEqual is safe.
      resolve(crypto.timingSafeEqual(expected, derivedKey))
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

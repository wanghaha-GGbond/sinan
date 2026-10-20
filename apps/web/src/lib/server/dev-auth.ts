type RuntimeEnv = Record<string, string | undefined>

/**
 * Local preview identities are intentionally opt-in. A missing database must
 * never turn into an authentication bypass in a deployed environment.
 */
export function isDevAuthEnabled(env: RuntimeEnv = process.env): boolean {
  const deployed =
    env.NODE_ENV === "production" ||
    env.VERCEL_ENV === "production" ||
    env.NEXT_PUBLIC_APP_ENV === "production" ||
    env.NEXT_PUBLIC_APP_ENV === "staging"

  return !deployed && !env.DATABASE_URL && env.ALLOW_DEV_AUTH === "true"
}

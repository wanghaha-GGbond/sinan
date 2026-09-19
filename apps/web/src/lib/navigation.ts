const DEFAULT_AFTER_AUTH = "/"

/**
 * Only allow same-origin app paths as post-auth destinations.
 * This keeps `next` useful without turning login/register into open redirects.
 */
export function getSafeNextPath(
  value: string | null | undefined,
  fallback = DEFAULT_AFTER_AUTH,
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback

  try {
    const parsed = new URL(value, "https://sinan.local")
    if (parsed.origin !== "https://sinan.local") return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

export function withNext(pathname: string, nextPath: string): string {
  const params = new URLSearchParams({ next: getSafeNextPath(nextPath) })
  return `${pathname}?${params.toString()}`
}

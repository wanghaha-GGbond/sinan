export function getSafeAppPath(
  value: string | string[] | undefined,
  fallback = "/",
): string {
  const candidate = Array.isArray(value) ? value[0] : value
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback
  }
  return candidate
}

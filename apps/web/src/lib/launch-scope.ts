const deferredPrefixes = [
  "/auction",
  "/circles",
  "/community",
  "/salaries",
  "/jobs",
  "/benefits",
  "/me/inbox",
  "/me/requests-outgoing",
  "/api/auctions",
  "/api/circles",
  "/api/dm",
  "/api/leaderboard/auctions",
] as const

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function isDeferredLaunchPath(pathname: string): boolean {
  return (
    deferredPrefixes.some((prefix) => matchesPrefix(pathname, prefix)) ||
    /^\/company\/[^/]+\/ratings(?:\/|$)/.test(pathname)
  )
}

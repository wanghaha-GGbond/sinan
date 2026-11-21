/** Research collection/publishing stays internal. No public switch or data deletion. */
export function researchIsInternal() { return true }

export function isResearchPath(pathname: string) {
  return ["/research", "/api/research"].some(root => pathname === root || pathname.startsWith(root + "/"))
}

/** Treat a URL score only as an editable draft, never as an accepted rating. */
export function ratingDraftScore(value: string | null): number | null {
  if (value === null || !/^(?:\d(?:\.\d)?|10(?:\.0)?)$/.test(value)) return null
  return Number(value)
}

export function ratingReviewHref(companyId: string, score: number): string {
  if (!Number.isFinite(score) || score < 0 || score > 10) throw new Error("Invalid rating draft")
  return `/submit/review?${new URLSearchParams({ companyId, directionScore: String(score) })}`
}

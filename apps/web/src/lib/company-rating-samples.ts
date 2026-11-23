/** Old responses omit the new field; an explicit zero must never fall back. */
export function companyRatingSampleCount(company: { ratingSampleCount?: number; reviewCount?: number }) {
  return company.ratingSampleCount ?? company.reviewCount ?? 0
}

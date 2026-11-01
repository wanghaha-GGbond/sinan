// Display existing reviewed company data only; never synthesize employees' scores.
export function publicCompanyWebsite(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

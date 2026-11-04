import sources from "@/data/company-logo-sources.json"

// Match the stable reviewed company ID AND name. An arbitrary remote logoUrl
// must never trigger a tracking request or impersonate another brand.
export function companyLogo(company: { id: string; name: string }): string | null {
  const source = sources.find(item => item.id === company.id && item.name === company.name)
  return source?.asset ?? null
}

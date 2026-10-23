const demoCompanyIds = new Set(["northstar-tech", "lighthouse-media", "river-finance"])

export function isDemoCompanyId(id: string) {
  return demoCompanyIds.has(id)
}

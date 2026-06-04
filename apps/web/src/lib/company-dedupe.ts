import type { Company, CompanyListItem } from "@/lib/types"

export type CompanyDedupeInput = {
  name?: string
  registeredName?: string
  unifiedSocialCreditCode?: string
  city?: string
  industry?: string
}

export type SimilarCompanyResult = {
  company: Company | CompanyListItem
  reasons: string[]
  score: number
}

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "")
}

export function findSimilarCompanies(input: CompanyDedupeInput, companies: (Company | CompanyListItem)[]): SimilarCompanyResult[] {
  const name = normalize(input.name)
  const registeredName = normalize(input.registeredName)
  const code = normalize(input.unifiedSocialCreditCode).toUpperCase()
  const city = normalize(input.city)

  return companies
    .map((company) => {
      const reasons: string[] = []
      let score = 0
      const aliasList = 'aliases' in company ? (company as CompanyListItem).aliases ?? [] : []
      const companyNames = [company.name, company.registeredName, company.shortName, company.englishName, ...aliasList]
        .map(normalize)
        .filter(Boolean)
      const companyCode = normalize((company as Company).unifiedSocialCreditCode).toUpperCase()
      const sameCity = city && normalize(company.city) === city

      if (code && companyCode && code === companyCode) {
        score = Math.max(score, 100)
        reasons.push("统一社会信用代码一致")
      }
      if (registeredName && normalize(company.registeredName) === registeredName) {
        score = Math.max(score, 90)
        reasons.push("注册名称一致")
      }
      if (name && normalize(company.name) === name) {
        score = Math.max(score, 80)
        reasons.push("公司名称一致")
      }
      if (name && companyNames.some((item) => item === name || item.includes(name) || name.includes(item))) {
        score = Math.max(score, sameCity ? 60 : 40)
        reasons.push(sameCity ? "名称相近且城市一致" : "名称相近")
      }
      if (name && companyNames.some((item) => item !== normalize(company.name) && item.includes(name))) {
        score = Math.max(score, 70)
        reasons.push("简称或别名命中")
      }

      return { company, reasons: Array.from(new Set(reasons)), score }
    })
    .filter((item) => item.score >= 60)
    .sort((a, b) => b.score - a.score)
}

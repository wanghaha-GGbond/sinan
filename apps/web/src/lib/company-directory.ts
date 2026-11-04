import type { CompanyListItem } from "./types"

export type DirectorySort = "reviews" | "score" | "recommendation" | "recent"
type DirectoryCompany = Pick<CompanyListItem, "id" | "name" | "shortName" | "englishName" | "aliases" | "industry" | "city" | "createdAt" | "directionScore" | "recommendationRate" | "reviewCount">

function publicMetric(value: number | undefined, count: number | undefined, maximum: number) {
  return (count ?? 0) > 0 && typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum ? value : -1
}

function dateValue(value: string) {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function filterAndSortCompanies<T extends DirectoryCompany>(
  companies: readonly T[],
  { query, city, sort, ratedOnly }: { query: string; city: string; sort: DirectorySort; ratedOnly: boolean },
): T[] {
  const keyword = query.trim().toLowerCase()
  return companies.filter((company) =>
    (city === "全部" || company.city === city)
    && (!ratedOnly || (company.reviewCount ?? 0) > 0)
    && (!keyword || [company.name, company.shortName, company.englishName, company.industry, company.city, ...(company.aliases ?? [])]
      .some((value) => value?.toLowerCase().includes(keyword))),
  ).sort((a, b) => {
    const metric = sort === "score" ? publicMetric(b.directionScore, b.reviewCount, 10) - publicMetric(a.directionScore, a.reviewCount, 10)
      : sort === "recommendation" ? publicMetric(b.recommendationRate, b.reviewCount, 100) - publicMetric(a.recommendationRate, a.reviewCount, 100)
      : sort === "recent" ? dateValue(b.createdAt) - dateValue(a.createdAt)
      : (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
    return metric || a.name.localeCompare(b.name, "zh-CN") || a.id.localeCompare(b.id)
  })
}

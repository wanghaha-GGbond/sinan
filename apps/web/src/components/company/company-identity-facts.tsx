import { ArrowUpRight } from "lucide-react"
import type { CompanyListItem } from "@/lib/types"
import { publicCompanyFactSource } from "@/lib/curated-companies"

export function CompanyIdentityFacts({ company }: { company: CompanyListItem }) {
  const source = publicCompanyFactSource(company)
  const facts = [["行业", company.industry], ["城市", company.city], ["规模", company.size], ["企业名称", company.registeredName]]
    .filter((item): item is [string, string] => Boolean(item[1]))
  return <section aria-label="公司公开资料" className="pb-6">
    <h2 className="text-lg font-semibold">公司资料</h2>
    <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
      {facts.map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-3">
        <dt className="shrink-0 text-muted-foreground">{label}</dt><dd className="break-words text-right font-medium">{value}</dd>
      </div>)}
    </dl>
    {source ? <a href={source} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary-deep hover:underline">查看资料来源：公司官网<ArrowUpRight className="size-4" aria-hidden="true" /></a> : null}
  </section>
}

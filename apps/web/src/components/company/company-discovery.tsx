import Link from "next/link"
import { HomeCompanyFeed, HomeCompanySidebar } from "@/components/company/home-company-feed"
import { HomeCompanySearch } from "@/components/company/home-company-search"

export function CompanyDiscovery() {
  return (
    <section className="mx-auto w-full max-w-5xl border-border pb-12 lg:grid lg:grid-cols-[minmax(0,1fr)_260px]" data-testid="home-recommend-feed">
      <div className="min-w-0 lg:border-r lg:border-border">
      <header className="px-4 pb-4 pt-7 sm:px-6 sm:pt-9">
        <h2 className="text-2xl font-semibold text-foreground">找公司</h2>
        <HomeCompanySearch />
        <div className="mt-4 flex gap-5 text-sm font-medium text-primary-deep">
          <Link href="/companies" className="inline-flex min-h-11 items-center hover:underline">全部公司</Link>
          <Link href="/community" className="inline-flex min-h-11 items-center hover:underline">公司讨论</Link>
          <Link href="/submit/review" className="inline-flex min-h-11 items-center hover:underline">匿名评分</Link>
        </div>
      </header>

      <HomeCompanyFeed />
      </div>
      <HomeCompanySidebar />
    </section>
  )
}

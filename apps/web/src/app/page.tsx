import Link from "next/link"
import { HomeCompanyFeed, HomeCompanySidebar } from "@/components/company/home-company-feed"
import { HomeCompanySearch } from "@/components/company/home-company-search"

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-[1120px] border-border pb-12 sm:border-x lg:grid lg:grid-cols-[minmax(0,740px)_minmax(0,1fr)]" data-testid="home-recommend-feed">
      <div className="min-w-0 lg:border-r lg:border-border">
      <header className="px-4 pb-4 pt-7 sm:px-6 sm:pt-9">
        <h1 className="text-2xl font-semibold text-foreground">找公司</h1>
        <HomeCompanySearch />
        <div className="mt-4 flex gap-5 text-sm font-medium text-primary-deep">
          <Link href="/companies" className="inline-flex min-h-11 items-center hover:underline">全部公司</Link>
          <Link href="/research" className="inline-flex min-h-11 items-center hover:underline">公司研究</Link>
          <Link href="/submit/review" className="inline-flex min-h-11 items-center hover:underline">匿名评分</Link>
        </div>
      </header>

      <HomeCompanyFeed />
      </div>
      <HomeCompanySidebar />
    </section>
  )
}

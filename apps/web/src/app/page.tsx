import Link from "next/link"
import { HomeCompanyFeed, HomeCompanySidebar } from "@/components/company/home-company-feed"
import { HomeCompanySearch } from "@/components/company/home-company-search"

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-page pb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px]" data-testid="home-recommend-feed">
      <div className="min-w-0 px-4 pt-6 sm:px-6 lg:border-r lg:border-border">
      <header className="pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">找公司</h1>
        <HomeCompanySearch />
        <div className="mt-4 flex gap-5 text-sm font-medium text-primary-deep">
          <Link href="/companies" className="inline-flex min-h-11 items-center hover:underline">全部公司</Link>
          <Link href="/research" className="inline-flex min-h-11 items-center hover:underline">公司研究</Link>
          <Link href="/submit/review" className="inline-flex min-h-11 items-center hover:underline">匿名评分</Link>
        </div>
      </header>

      <div className="flex items-end justify-between gap-4 border-t border-border pt-5">
        <h2 className="text-lg font-semibold text-foreground">公司速览</h2>
        <Link href="/companies" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-deep hover:text-primary">查看全部</Link>
      </div>
      <div className="mt-4"><HomeCompanyFeed /></div>
      </div>
      <HomeCompanySidebar />
    </section>
  )
}

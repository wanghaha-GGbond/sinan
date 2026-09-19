import Link from "next/link"
import { HomeCompanyFeed } from "@/components/company/home-company-feed"
import { HomeCompanySearch } from "@/components/company/home-company-search"

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-page px-4 py-8 sm:px-6 lg:py-12" data-testid="home-recommend-feed">
      <header className="py-4 sm:py-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">找公司</h1>
        <HomeCompanySearch />
        <div className="mt-4 flex gap-5 text-sm font-medium text-primary-deep">
          <Link href="/companies" className="inline-flex min-h-11 items-center hover:underline">全部公司</Link>
          <Link href="/research" className="inline-flex min-h-11 items-center hover:underline">公司研究</Link>
        </div>
      </header>

      <div className="mt-10 flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">最新公司</h2>
        <Link href="/companies" className="text-sm font-semibold text-primary-deep hover:text-primary">查看全部</Link>
      </div>
      <div className="mt-4"><HomeCompanyFeed /></div>
    </section>
  )
}

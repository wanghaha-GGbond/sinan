import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { HomeCompanyFeed, HomeCompanySidebar } from "@/components/company/home-company-feed"
import { HomeCompanySearch } from "@/components/company/home-company-search"

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-[1120px] border-x-0 border-border pb-12 sm:border-x lg:grid lg:grid-cols-[minmax(0,740px)_minmax(0,1fr)]" data-testid="home-recommend-feed">
      <div className="min-w-0 lg:border-r lg:border-border">
        <header className="px-4 pb-4 pt-7 sm:px-6 sm:pt-9">
          <h1 className="text-2xl font-semibold text-foreground">找公司</h1>
          <HomeCompanySearch />
          <div className="mt-2 flex gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/companies" className="inline-flex min-h-11 items-center gap-2 hover:text-foreground">全部公司 <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
            <Link href="/research" className="inline-flex min-h-11 items-center gap-2 hover:text-foreground">公司研究 <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
          </div>
        </header>
        <HomeCompanyFeed />
      </div>
      <HomeCompanySidebar />
    </section>
  )
}

import Link from "next/link"

import { HomeCompanyFeed } from "@/components/company/home-company-feed"
import { SolidButton } from "@/components/ui/solid-button"

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-page px-4 py-6 sm:px-6" data-testid="home-recommend-feed">
      <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-muted p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">邀请制 Beta</p>
          <h1 className="mt-1 text-2xl font-bold">入职前，先看清方向</h1>
          <p className="mt-2 text-sm text-muted-foreground">真实公司、匿名评价与可追溯研报，内容先审后发。</p>
        </div>
        <div className="flex gap-2">
          <SolidButton asChild variant="secondary"><Link href="/research">浏览研报</Link></SolidButton>
          <SolidButton asChild variant="primary"><Link href="/submit/review">写评价</Link></SolidButton>
        </div>
      </div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">最新公司</h2>
        <Link href="/search" className="text-sm font-semibold text-primary">搜索公司</Link>
      </div>
      <HomeCompanyFeed />
    </section>
  )
}

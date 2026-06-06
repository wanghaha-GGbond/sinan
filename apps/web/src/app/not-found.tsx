import Link from "next/link"
import { Compass, Home, Search } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-col items-center px-4 py-16 sm:py-24">
      <SolidCard variant="elevated" className="w-full p-10 text-center">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-[#F1F5EF]">
          <Compass className="size-8 text-[#9CA3AF]" />
        </div>
        <p className="mt-2 text-2xl font-semibold text-[#111827]">这条路还没画在司南上</p>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
          你访问的页面可能已下架、被合并,或者从未存在过。回到主页,或者直接搜一家公司。
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <SolidButton asChild variant="primary" size="lg">
            <Link href="/">
              <Home className="size-4" />
              回到推荐流
            </Link>
          </SolidButton>
          <SolidButton asChild variant="secondary" size="lg">
            <Link href="/search">
              <Search className="size-4" />
              搜索公司
            </Link>
          </SolidButton>
        </div>
      </SolidCard>
    </section>
  )
}

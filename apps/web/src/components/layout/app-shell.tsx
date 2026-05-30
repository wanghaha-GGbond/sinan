"use client"

import Link from "next/link"
import { Compass, Search } from "lucide-react"
import { usePathname } from "next/navigation"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidTopbar } from "@/components/ui/solid-topbar"

function HomeHeader() {
  return (
    <SolidTopbar
      title="司南 推荐"
      variant="home"
      leftSlot={
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#DFF8EC] text-[#07563A]">
            <Compass className="size-4" />
          </span>
          <h1 className="text-base font-semibold text-[#111827]">司南 推荐</h1>
        </div>
      }
      rightSlot={
        <SolidButton asChild variant="dark" size="sm" data-testid="home-search-link">
          <Link href="/search">
            <Search data-icon="inline-start" />
            搜索
          </Link>
        </SolidButton>
      }
    />
  )
}

function CompanyHeader() {
  return (
    <SolidTopbar
      title="司南"
      variant="compact"
      leftSlot={
        <Link href="/" className="text-sm font-semibold text-[#111827]">
          司南
        </Link>
      }
      rightSlot={
        <SolidButton asChild variant="secondary" size="sm">
          <Link href="/">返回推荐</Link>
        </SolidButton>
      }
    />
  )
}

function SearchHeader() {
  return (
    <SolidTopbar
      title="搜索公司"
      variant="default"
      rightSlot={
        <SolidButton asChild variant="secondary" size="sm">
          <Link href="/">返回推荐</Link>
        </SolidButton>
      }
    />
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isHome = pathname === "/"
  const isCompany = pathname.startsWith("/company")
  const isSearch = pathname.startsWith("/search")

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isHome ? <HomeHeader /> : isSearch ? <SearchHeader /> : isCompany ? <CompanyHeader /> : <CompanyHeader />}
      <main>{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-[920px] flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>司南：入职前，先看清方向。</p>
          <p>匿名保护优先，不向公司开放用户身份。</p>
        </div>
      </footer>
    </div>
  )
}

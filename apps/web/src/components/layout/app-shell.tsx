"use client"

import Link from "next/link"
import { Compass, PenLine, Search, User, LogOut } from "lucide-react"
import { usePathname } from "next/navigation"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidTopbar } from "@/components/ui/solid-topbar"
import { useAuth } from "@/lib/auth-context"

function HomeHeader() {
  const { user, logout } = useAuth()

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
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/me" className="flex items-center gap-1.5 rounded-full bg-[#F1F5EF] px-3 py-1.5 text-sm font-medium text-[#374151] transition hover:bg-[#E8EEE5]">
                <User className="size-3.5" />
                {user.displayName ?? "我"}
              </Link>
              <SolidButton asChild variant="primary" size="sm">
                <Link href="/submit/review">
                  <PenLine className="size-3.5" />
                  写评价
                </Link>
              </SolidButton>
              <button
                onClick={() => logout()}
                className="rounded-full p-1.5 text-[#9CA3AF] transition hover:bg-[#F1F5EF] hover:text-[#6B7280]"
                title="退出"
              >
                <LogOut className="size-4" />
              </button>
            </>
          ) : (
            <>
              <SolidButton asChild variant="ghost" size="sm">
                <Link href="/login">登录</Link>
              </SolidButton>
              <SolidButton asChild variant="secondary" size="sm">
                <Link href="/me">
                  <User className="size-3.5" />
                  我的
                </Link>
              </SolidButton>
              <SolidButton asChild variant="primary" size="sm">
                <Link href="/submit/review">
                  <PenLine className="size-3.5" />
                  写评价
                </Link>
              </SolidButton>
              <SolidButton asChild variant="dark" size="sm" data-testid="home-search-link">
                <Link href="/search">
                  <Search data-icon="inline-start" />
                  搜索
                </Link>
              </SolidButton>
            </>
          )}
        </div>
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
        <div className="flex items-center gap-2">
          <SolidButton asChild variant="primary" size="sm">
            <Link href="/submit/review">
              <PenLine className="size-3.5" />
              写评价
            </Link>
          </SolidButton>
          <SolidButton asChild variant="secondary" size="sm">
            <Link href="/">返回推荐</Link>
          </SolidButton>
        </div>
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
        <div className="flex items-center gap-2">
          <SolidButton asChild variant="primary" size="sm">
            <Link href="/submit/review">
              <PenLine className="size-3.5" />
              写评价
            </Link>
          </SolidButton>
          <SolidButton asChild variant="secondary" size="sm">
            <Link href="/">返回推荐</Link>
          </SolidButton>
        </div>
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

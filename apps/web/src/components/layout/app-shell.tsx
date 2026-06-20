"use client"

import Link from "next/link"
import {
  Compass,
  LogOut,
  MessageSquareText,
  PenLine,
  Search,
  User,
  UsersRound,
} from "lucide-react"
import { usePathname } from "next/navigation"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidTopbar } from "@/components/ui/solid-topbar"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useAuth } from "@/lib/auth-context"

const intelLinks = [
  // Plan S0 T0.3 (2026-06-10): salaries / jobs / benefits moved out of
  // the main nav. The routes are still live (deep-link friendly), but
  // the surfaces are now reachable through the company page and search
  // results only. Interviews and community stay because they're the
  // two dimensions every 打工人 evaluation actually answers to.
  { href: "/interviews", label: "面试", icon: MessageSquareText },
  { href: "/community", label: "社区", icon: UsersRound },
]

function IntelNav() {
  const pathname = usePathname()

  return (
    <nav className="mx-auto flex w-full max-w-page gap-2 overflow-x-auto px-4 py-2 sm:px-6" aria-label="职场情报导航">
      {intelLinks.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              active
                ? "bg-foreground text-white shadow-[0_4px_0_rgba(17,24,39,0.22)]"
                : "bg-muted text-foreground hover:bg-muted-hover"
            }`}
          >
            <item.icon className="size-3.5" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function HomeHeader() {
  const { user, logout } = useAuth()

  return (
    <SolidTopbar
      title="司南 推荐"
      variant="home"
      leftSlot={
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground sm:flex">
            <Compass className="size-4" />
          </span>
          <h1 className="whitespace-nowrap text-base font-semibold text-foreground">司南推荐</h1>
        </div>
      }
      rightSlot={
        <div className="flex items-center gap-1.5">
          {user ? (
            <>
              <Link href="/me" className="flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted-hover">
                <User className="size-3.5" />
                <span className="hidden sm:inline">{user.displayName ?? "我"}</span>
                <span className="sm:hidden">我的</span>
              </Link>
              <SolidButton asChild variant="primary" size="sm">
                <Link href="/submit/review">
                  <PenLine className="size-3.5" />
                  写评价
                </Link>
              </SolidButton>
              <ThemeToggle />
              <button
                onClick={() => logout()}
                aria-label="退出登录"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <LogOut className="size-4" />
              </button>
            </>
          ) : (
            <>
              <SolidButton asChild variant="ghost" size="sm">
                <Link href="/login" className="hidden sm:inline-flex">登录</Link>
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
              <ThemeToggle />
              <SolidButton asChild variant="dark" size="sm" data-testid="home-search-link">
                <Link href="/search" aria-label="搜索">
                  <Search data-icon="inline-start" />
                  <span className="hidden sm:inline">搜索</span>
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
        <Link href="/" className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-semibold text-foreground">
          司南
        </Link>
      }
      rightSlot={
        <div className="flex items-center gap-2">
          <ThemeToggle />
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
          <ThemeToggle />
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
  const showIntelNav = isHome || isCompany || isSearch || intelLinks.some((item) => pathname.startsWith(item.href))

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isHome ? <HomeHeader /> : isSearch ? <SearchHeader /> : isCompany ? <CompanyHeader /> : <CompanyHeader />}
      {showIntelNav ? <IntelNav /> : null}
      <main>{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-page flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>司南:入职前,先看清方向。</p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-semibold text-foreground"
              data-testid="footer-toc-promise"
            >
              <UsersRound className="size-3.5" />
              <span>纯打工人社区</span>
              <span>· 企业认证不触碰匿名身份</span>
            </span>
            <span>匿名保护优先，公司只能回应公开内容。</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

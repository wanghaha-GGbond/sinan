"use client"

import Link from "next/link"
import {
  BookOpen,
  Compass,
  Home,
  LogOut,
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
  { href: "/research", label: "研报", icon: BookOpen },
]

const mobileAppLinks = [
  { href: "/", label: "推荐", icon: Home, match: (pathname: string) => pathname === "/" },
  { href: "/search", label: "搜索", icon: Search, match: (pathname: string) => pathname.startsWith("/search") || pathname.startsWith("/company/") },
  { href: "/submit/review", label: "评价", icon: PenLine, match: (pathname: string) => pathname.startsWith("/submit/review") },
  { href: "/research", label: "研报", icon: BookOpen, match: (pathname: string) => pathname.startsWith("/research") },
  { href: "/me", label: "我的", icon: User, match: (pathname: string) => pathname.startsWith("/me") || pathname.startsWith("/settings/") },
]

function MobileAppNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="App 主导航"
      className="fixed inset-x-0 bottom-0 z-sticky border-t border-primary-surface-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(14,143,95,0.08)] backdrop-blur-xl sm:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 px-1">
        {mobileAppLinks.map((item) => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition ${
                active ? "text-primary-deep" : "text-muted-foreground active:bg-muted"
              }`}
            >
              <span className={`flex size-8 items-center justify-center rounded-full ${active ? "bg-primary-tint" : ""}`}>
                <item.icon className="size-4" aria-hidden="true" />
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

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

function AuthHeader() {
  return (
    <SolidTopbar
      title="司南"
      variant="compact"
      leftSlot={
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-semibold text-foreground">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary-tint text-primary-deep">
            <Compass className="size-4" aria-hidden="true" />
          </span>
          司南
        </Link>
      }
      rightSlot={<ThemeToggle />}
    />
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isHome = pathname === "/"
  const isCompany = pathname.startsWith("/company")
  const isSearch = pathname.startsWith("/search")
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/invite/")
  const showIntelNav = isHome || isCompany || isSearch || intelLinks.some((item) => pathname.startsWith(item.href))
  const hideMobileAppNav =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/moderation/") ||
    pathname.startsWith("/admin/")

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isHome ? <HomeHeader /> : isAuthRoute ? <AuthHeader /> : isSearch ? <SearchHeader /> : isCompany ? <CompanyHeader /> : <CompanyHeader />}
      {showIntelNav ? <IntelNav /> : null}
      <main className={hideMobileAppNav ? undefined : "pb-20 sm:pb-0"}>{children}</main>
      <footer className={`border-t ${hideMobileAppNav ? "" : "mb-16 sm:mb-0"}`}>
        <div className="mx-auto flex w-full max-w-page flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>司南:入职前,先看清方向。</p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Link href="/legal/privacy" className="hover:text-foreground">隐私政策</Link>
            <Link href="/legal/terms" className="hover:text-foreground">用户协议</Link>
            <Link href="/settings/account" className="hover:text-foreground">账号与数据</Link>
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
      {hideMobileAppNav ? null : <MobileAppNav pathname={pathname} />}
    </div>
  )
}

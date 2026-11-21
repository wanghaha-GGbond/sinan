"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, MessageCircle, UserRound } from "lucide-react"

import { WebButton } from "@/components/ui/web-button"
import { WebNav } from "@/components/ui/web-nav"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { mainNavigation } from "@/lib/app-navigation"
import { useAuth } from "@/lib/auth-context"

function MainNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/invite/")

  return (
    <WebNav
      links={isAuthRoute ? [] : mainNavigation(pathname)}
      showSearch={!['/', '/companies', '/search'].includes(pathname)}
      rightSlot={
        <>
          <ThemeToggle />
          {user ? (
            <>
              <WebButton asChild variant="quiet" className="min-h-11 lg:hidden" aria-label="个人主页">
                <Link href="/me">个人主页</Link>
              </WebButton>
            </>
          ) : (
            <>
              <WebButton asChild variant="quiet" className="min-h-11" aria-label="登录">
                <Link href="/login">登录</Link>
              </WebButton>
              {!isAuthRoute ? <WebButton asChild variant="primary" className="min-h-11"><Link href="/register">注册</Link></WebButton> : null}
            </>
          )}
        </>
      }
    />
  )
}

function MobileNav() {
  const pathname = usePathname()
  if (["/login", "/register", "/forgot-password", "/reset-password", "/invite/"].some((path) => pathname.startsWith(path))) return null
  const icons = { "/companies": Building2, "/community": MessageCircle, "/me": UserRound }
  const links = mainNavigation(pathname)
  return (
    <nav aria-label="快捷导航" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      {links.map((link) => {
        const Icon = icons[link.href as keyof typeof icons]
        return <Link key={link.href} href={link.href} aria-current={link.active ? "page" : undefined}
          className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-ring ${link.active ? "text-primary-deep" : "text-muted-foreground"}`}>
          <span className={`grid h-7 w-12 place-items-center rounded-full ${link.active ? "bg-primary-tint" : ""}`}><Icon className="size-5" aria-hidden="true" /></span>{link.label}
        </Link>
      })}
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const icpFilingNumber = process.env.NEXT_PUBLIC_ICP_FILING_NUMBER

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground max-lg:pb-20">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:text-foreground focus:shadow-lg">跳到主要内容</a>
      <MainNav />
      <main id="main-content" tabIndex={-1} className="flex-1 scroll-mt-24">
        {children}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-page flex-col gap-3 px-4 py-7 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>在场</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <Link href="/support" className="inline-flex min-h-11 items-center hover:text-foreground">帮助与反馈</Link>
            <Link href="/legal/privacy" className="inline-flex min-h-11 items-center hover:text-foreground">隐私政策</Link>
            <Link href="/legal/terms" className="inline-flex min-h-11 items-center hover:text-foreground">用户协议</Link>
            <Link href="/settings/account" className="inline-flex min-h-11 items-center hover:text-foreground">账号与数据</Link>
            {icpFilingNumber ? (
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="hover:text-foreground">{icpFilingNumber}</a>
            ) : null}
          </div>
        </div>
      </footer>
      <MobileNav />
    </div>
  )
}

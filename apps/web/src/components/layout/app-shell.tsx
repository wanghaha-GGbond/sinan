"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { WebButton } from "@/components/ui/web-button"
import { WebNav, type WebNavLink } from "@/components/ui/web-nav"
import { useAuth } from "@/lib/auth-context"
import { isPulseEnabled } from "@/lib/pulse-feature"

const primaryLinks = [
  { href: "/companies", label: "公司" },
  { href: "/research", label: "研究" },
  { href: "/pulse", label: "Pulse" },
  { href: "/submit/review", label: "写评价" },
  { href: "/me", label: "我的" },
]

const pulseEnabled = isPulseEnabled({
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_PULSE_ENABLED: process.env.NEXT_PUBLIC_PULSE_ENABLED,
})

function linksFor(pathname: string): WebNavLink[] {
  return primaryLinks.filter((link) => pulseEnabled || link.href !== "/pulse").map((link) => ({
    ...link,
    active:
      link.href === "/companies"
        ? pathname.startsWith("/companies") || pathname.startsWith("/company/") || pathname.startsWith("/search")
        : link.href === "/me"
        ? pathname.startsWith("/me") || pathname.startsWith("/settings")
        : link.href === "/submit/review"
          ? pathname.startsWith("/submit")
          : pathname.startsWith(link.href),
  }))
}

function MainNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/invite/")

  return (
    <WebNav
      links={isAuthRoute ? [] : linksFor(pathname)}
      showSearch={!['/', '/companies', '/search'].includes(pathname)}
      rightSlot={
        <>
          {user ? (
            <>
              <WebButton asChild variant="quiet" className="min-h-11" aria-label="个人主页">
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const icpFilingNumber = process.env.NEXT_PUBLIC_ICP_FILING_NUMBER

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:text-foreground focus:shadow-lg">跳到主要内容</a>
      <MainNav />
      <main id="main-content" tabIndex={-1} className="flex-1 scroll-mt-24">{children}</main>
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
    </div>
  )
}

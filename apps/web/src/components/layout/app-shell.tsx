"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"

import { WebButton } from "@/components/ui/web-button"
import { WebNav, type WebNavLink } from "@/components/ui/web-nav"
import { useAuth } from "@/lib/auth-context"

const primaryLinks = [
  { href: "/companies", label: "公司" },
  { href: "/research", label: "研究" },
  { href: "/pulse", label: "Pulse" },
  { href: "/submit/review", label: "写评价" },
  { href: "/me", label: "我的" },
]

function linksFor(pathname: string): WebNavLink[] {
  return primaryLinks.map((link) => ({
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
  const { user, logout } = useAuth()
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/invite/")

  return (
    <WebNav
      links={isAuthRoute ? [] : linksFor(pathname)}
      rightSlot={
        <>
          {user ? (
            <>
              <WebButton asChild variant="quiet" size="icon" className="hidden rounded-full bg-muted text-foreground sm:inline-flex" aria-label="打开我的账户">
                <Link href="/me"><span className="text-xs font-semibold">{(user.displayName ?? "我").slice(0, 1)}</span></Link>
              </WebButton>
              <WebButton type="button" variant="quiet" size="icon" className="hidden sm:inline-flex" aria-label="退出登录" onClick={() => logout()}>
                <LogOut className="size-4" />
              </WebButton>
            </>
          ) : (
            <WebButton asChild variant="quiet" size="icon" className="hidden rounded-full bg-muted text-foreground sm:inline-flex" aria-label="登录">
              <Link href="/login"><span className="text-xs font-semibold">N</span></Link>
            </WebButton>
          )}
        </>
      }
    />
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const icpFilingNumber = process.env.NEXT_PUBLIC_ICP_FILING_NUMBER

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MainNav />
      <main>{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-page flex-col gap-3 px-4 py-7 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>司南：入职前，先看清方向。</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <Link href="/legal/privacy" className="hover:text-foreground">隐私政策</Link>
            <Link href="/legal/terms" className="hover:text-foreground">用户协议</Link>
            <Link href="/settings/account" className="hover:text-foreground">账号与数据</Link>
            {icpFilingNumber ? (
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="hover:text-foreground">{icpFilingNumber}</a>
            ) : null}
            <span className="text-muted-foreground/80">匿名保护优先，公司只能回应公开内容。</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

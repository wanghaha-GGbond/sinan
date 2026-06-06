"use client"

import Link from "next/link"
import {
  BriefcaseBusiness,
  Building2,
  Compass,
  Gift,
  LogOut,
  MessageSquareText,
  PenLine,
  ReceiptText,
  Search,
  User,
  UsersRound,
} from "lucide-react"
import { usePathname } from "next/navigation"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidTopbar } from "@/components/ui/solid-topbar"
import { useAuth } from "@/lib/auth-context"

const intelLinks = [
  { href: "/salaries", label: "薪资", icon: ReceiptText },
  { href: "/interviews", label: "面试", icon: MessageSquareText },
  { href: "/jobs", label: "机会", icon: BriefcaseBusiness },
  { href: "/benefits", label: "福利", icon: Gift },
  { href: "/community", label: "社区", icon: UsersRound },
]

function IntelNav() {
  const pathname = usePathname()

  return (
    <nav className="mx-auto flex w-full max-w-[920px] gap-2 overflow-x-auto px-4 py-2 sm:px-6" aria-label="职场情报导航">
      {intelLinks.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              active
                ? "bg-foreground text-white shadow-[0_4px_0_rgba(17,24,39,0.22)]"
                : "bg-muted text-foreground hover:bg-[#E8EEE5]"
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
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Compass className="size-4" />
          </span>
          <h1 className="text-base font-semibold text-foreground">司南 推荐</h1>
        </div>
      }
      rightSlot={
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/me" className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-[#E8EEE5]">
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
                className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-muted-foreground"
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
        <Link href="/" className="text-sm font-semibold text-foreground">
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
  const showIntelNav = isHome || isCompany || isSearch || intelLinks.some((item) => pathname.startsWith(item.href))

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isHome ? <HomeHeader /> : isSearch ? <SearchHeader /> : isCompany ? <CompanyHeader /> : <CompanyHeader />}
      {showIntelNav ? <IntelNav /> : null}
      <main>{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-[920px] flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>司南:入职前,先看清方向。</p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Link
              href="/company-portal"
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 font-semibold text-foreground transition hover:bg-[#E8EEE5]"
              data-testid="footer-company-portal"
            >
              <Building2 className="size-3.5" />
              我是公司 · 打开控制台
            </Link>
            <span>匿名保护优先,不向公司开放用户身份。</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

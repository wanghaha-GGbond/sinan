"use client"

import Link from "next/link"
import { Bell, Leaf, Menu, Search } from "lucide-react"
import type { ReactNode } from "react"

import { WebButton } from "@/components/ui/web-button"
import { cn } from "@/lib/utils"

export type WebNavLink = { href: string; label: string; active?: boolean }

export function WebNav({
  brand = "司南",
  links = [],
  searchHref = "/search",
  rightSlot,
  className,
}: {
  brand?: string
  links?: WebNavLink[]
  searchHref?: string
  rightSlot?: ReactNode
  className?: string
}) {
  return (
    <header className={cn("web-nav", className)}>
      <div className="web-nav-inner">
        <Link href="/" className="web-brand" aria-label="返回司南首页">
          <span className="web-brand-mark" aria-hidden="true"><Leaf className="size-[1.15rem]" strokeWidth={2.2} /></span>
          <span>{brand}</span>
        </Link>

        <Link href={searchHref} className="web-nav-search" aria-label="搜索公司、职位、话题">
          <Search className="size-4" aria-hidden="true" />
          <span>搜索公司、职位、话题</span>
        </Link>

        <nav className="web-nav-links" aria-label="主导航">
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={link.active ? "page" : undefined} className={cn(link.active && "is-active")}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="web-nav-actions">
          <WebButton variant="quiet" size="icon" className="relative" aria-label="通知">
            <Bell className="size-[1.15rem]" aria-hidden="true" />
            <span className="absolute right-2.5 top-2 size-1.5 rounded-full bg-primary" aria-hidden="true" />
          </WebButton>
          {rightSlot}
          <WebButton variant="quiet" size="icon" className="web-mobile-menu" aria-label="打开菜单">
            <Menu className="size-4" aria-hidden="true" />
          </WebButton>
        </div>
      </div>
    </header>
  )
}

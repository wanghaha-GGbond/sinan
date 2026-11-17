"use client"

import Link from "next/link"
import Image from "next/image"
import { Search } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type WebNavLink = { href: string; label: string; active?: boolean }

export function WebNav({
  brand = "在场",
  links = [],
  searchHref = "/search",
  showSearch = true,
  rightSlot,
  className,
}: {
  brand?: string
  links?: WebNavLink[]
  searchHref?: string
  showSearch?: boolean
  rightSlot?: ReactNode
  className?: string
}) {
  return (
    <header className={cn("web-nav", className)}>
      <div className="web-nav-inner">
        <Link href="/" className="web-brand" aria-label="返回在场首页">
          <Image src="/brand-z.svg" alt="" width={32} height={32} className="rounded-lg" unoptimized />
          <span className="max-[360px]:hidden">{brand}</span>
        </Link>

        {showSearch ? <Link href={searchHref} className="web-nav-search" aria-label="搜索公司">
          <Search className="size-4" aria-hidden="true" />
          <span>搜索公司</span>
        </Link> : null}

        <nav className="web-nav-links" aria-label="主导航">
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={link.active ? "page" : undefined} className={cn(link.active && "is-active")}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="web-nav-actions">
          {rightSlot}
        </div>
      </div>
    </header>
  )
}

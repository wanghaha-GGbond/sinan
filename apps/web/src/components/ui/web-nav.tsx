"use client"

import Link from "next/link"
import Image from "next/image"
import { Menu, Search } from "lucide-react"
import type { ReactNode } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { webButtonVariants } from "@/components/ui/web-button"
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
          <span>{brand}</span>
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
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                webButtonVariants({ variant: "quiet", size: "icon" }),
                // Responsive utilities replace the old .web-mobile-menu CSS:
                // that rule needed !important to beat these same utilities on
                // desktop, which in turn made the button invisible on mobile.
                "hidden max-lg:inline-flex",
              )}
              aria-label="打开菜单"
            >
              <Menu className="size-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              {links.map((link) => (
                <DropdownMenuItem key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={link.active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center rounded-md px-2.5 py-2 text-sm",
                      link.active ? "font-semibold text-primary-deep" : "text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

"use client"

import Link from "next/link"
import { Bell, Leaf, Menu, Search } from "lucide-react"
import type { ReactNode } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { WebButton, webButtonVariants } from "@/components/ui/web-button"
import { cn } from "@/lib/utils"

export type WebNavLink = { href: string; label: string; active?: boolean }

export function WebNav({
  brand = "在场",
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
        <Link href="/" className="web-brand" aria-label="返回在场首页">
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
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                webButtonVariants({ variant: "quiet", size: "icon" }),
                // Responsive utilities replace the old .web-mobile-menu CSS:
                // that rule needed !important to beat these same utilities on
                // desktop, which in turn made the button invisible on mobile.
                "hidden max-md:inline-flex",
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

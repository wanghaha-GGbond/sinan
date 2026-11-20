import Link from "next/link"
import { Activity, ArrowUpRight, BookOpen } from "lucide-react"
import { personalNavigation } from "@/lib/app-navigation"
import { cn } from "@/lib/utils"

export function PersonalNav({ pathname, pulseEnabled }: { pathname: string; pulseEnabled: boolean }) {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <p className="pt-4 text-xs font-medium text-muted-foreground">我的空间</p>
        <nav aria-label="我的工具" className="flex gap-4 sm:gap-7">
          {personalNavigation(pathname, pulseEnabled).map(link => (
            <Link key={link.href} href={link.href} aria-current={link.active ? "page" : undefined}
              className={cn("inline-flex min-h-12 items-center border-b-2 px-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring", link.active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}

export function PersonalTools({ pulseEnabled }: { pulseEnabled: boolean }) {
  const tools = [
    ...(pulseEnabled ? [{ href: "/pulse", title: "打卡与周报", detail: "记录今天，回看一周", icon: Activity }] : []),
    { href: "/research", title: "公司研究", detail: "机会、风险与工作体验", icon: BookOpen },
  ]
  return (
    <section aria-label="常用工具" className="grid gap-3 sm:grid-cols-2">
      {tools.map(({ href, title, detail, icon: Icon }) => (
        <Link key={href} href={href} className="group flex min-w-0 items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-muted-hover focus-visible:outline-2 focus-visible:outline-ring">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-tint text-primary-deep"><Icon className="size-5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-muted-foreground">{detail}</span></span>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
        </Link>
      ))}
    </section>
  )
}

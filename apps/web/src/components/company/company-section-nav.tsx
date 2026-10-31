import Link from "next/link"

export function CompanySectionNav({ id, active }: { id: string; active: "概览" | "评价" | "评分" | "承诺" }) {
  const base = `/company/${encodeURIComponent(id)}`
  return (
    <nav className="flex gap-6 overflow-x-auto border-t border-border" aria-label="公司信息导航">
      {([["概览", base], ["评价", `${base}/reviews`], ["评分", `${base}/ratings`], ["承诺", `${base}/promises`]] as const).map(([label, href]) => (
        <Link key={href} href={href} aria-current={label === active ? "page" : undefined}
          className={`inline-flex min-h-12 shrink-0 items-center border-b-2 px-1 text-sm font-semibold ${label === active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          {label}
        </Link>
      ))}
    </nav>
  )
}

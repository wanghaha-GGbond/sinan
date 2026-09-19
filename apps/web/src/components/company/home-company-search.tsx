"use client"

import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { WebButton } from "@/components/ui/web-button"

export function HomeCompanySearch() {
  const router = useRouter()

  return (
    <form
      role="search"
      className="mt-6 flex w-full max-w-2xl items-center gap-2 rounded-xl border border-border bg-card p-2 focus-within:border-primary"
      onSubmit={(event) => {
        event.preventDefault()
        const query = String(new FormData(event.currentTarget).get("q") ?? "").trim()
        router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search")
      }}
    >
      <Search className="ml-2 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <label htmlFor="home-company-search" className="sr-only">公司名称</label>
      <Input id="home-company-search" name="q" placeholder="搜索公司名称" className="h-12 min-w-0 border-0 bg-transparent shadow-none focus-visible:ring-0" />
      <WebButton type="submit" variant="primary">搜索</WebButton>
    </form>
  )
}

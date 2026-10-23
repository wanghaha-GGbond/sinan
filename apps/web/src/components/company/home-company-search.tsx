import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { WebButton } from "@/components/ui/web-button"

export function HomeCompanySearch() {
  return (
    <form
      role="search"
      action="/search"
      method="get"
      className="mt-6 flex w-full items-center gap-2 rounded-xl border border-input bg-card p-1.5 focus-within:outline-2 focus-within:outline-ring"
    >
      <Search className="ml-3 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <label htmlFor="home-company-search" className="sr-only">公司名称</label>
      <Input id="home-company-search" name="q" placeholder="搜索公司名称" className="h-11 min-w-0 border-0 bg-transparent shadow-none focus-visible:ring-0" />
      <WebButton type="submit" variant="primary" className="shrink-0">搜索</WebButton>
    </form>
  )
}

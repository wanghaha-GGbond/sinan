"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { WebButton } from "@/components/ui/web-button"

export function WebSearchField({
  value,
  onChange,
  onSubmit,
  placeholder = "搜索公司、职位或话题",
}: {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  placeholder?: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 transition-colors focus-within:border-primary-surface-border">
      <Search className="ml-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onSubmit?.() }} placeholder={placeholder} className="h-10 border-0 bg-transparent px-1 text-foreground shadow-none focus-visible:ring-0" />
      <WebButton type="button" variant="primary" size="sm" onClick={onSubmit}>搜索</WebButton>
    </div>
  )
}

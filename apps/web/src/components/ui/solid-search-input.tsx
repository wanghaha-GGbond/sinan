"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

export function SolidSearchInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex min-h-12 min-w-0 items-center gap-3 rounded-lg border border-input bg-card px-4 focus-within:outline-2 focus-within:outline-ring">
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">搜索公司</span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="搜索公司"
        className="min-w-0 border-0 bg-transparent px-0 text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
      />
    </label>
  )
}


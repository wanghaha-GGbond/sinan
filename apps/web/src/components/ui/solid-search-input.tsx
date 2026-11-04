"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { SolidButton } from "@/components/ui/solid-button"

export function SolidSearchInput({
  value,
  onChange,
  onQuickSearch,
}: {
  value: string
  onChange: (value: string) => void
  onQuickSearch?: () => void
}) {
  return (
    <div className="flex min-h-12 items-center gap-2 rounded-lg border border-input bg-card px-3 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Input
          aria-label="搜索公司"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="搜索公司"
          className="min-h-11 min-w-0 border-0 bg-transparent px-0 text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
        />
        {onQuickSearch ? <SolidButton variant="dark" size="sm" type="button" onClick={onQuickSearch}>
          搜索
        </SolidButton> : null}
    </div>
  )
}

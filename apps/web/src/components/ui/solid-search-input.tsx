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
    <div className="solid-card-subtle p-3">
      <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2">
        <Search className="size-4 text-[#6B7280]" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="搜索公司"
          className="border-0 bg-transparent px-0 text-[#1F2937] shadow-none placeholder:text-[#9CA3AF] focus-visible:ring-0"
        />
        <SolidButton variant="dark" size="sm" type="button" onClick={onQuickSearch}>
          搜索
        </SolidButton>
      </div>
    </div>
  )
}


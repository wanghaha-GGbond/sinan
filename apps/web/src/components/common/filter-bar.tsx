"use client"

import { Filter, X } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"

export type SortOption<T extends string> = { value: T; label: string }

export type FilterBarProps<TIndustry extends string, TCity extends string, TSort extends string> = {
  industries: readonly TIndustry[]
  cities: readonly TCity[]
  sortOptions: readonly SortOption<TSort>[]
  industry: TIndustry | "all"
  city: TCity | "all"
  sort: TSort
  resultCount: number
  onChangeIndustry: (value: TIndustry | "all") => void
  onChangeCity: (value: TCity | "all") => void
  onChangeSort: (value: TSort) => void
  onReset?: () => void
  /** Optional small label/description for the sort select. */
  sortLabel?: string
}

/**
 * Shared filter bar for the four intelligence hubs (salaries / interviews
 * / jobs / benefits). Renders three pill selects and a result count.
 * Stays uncontrolled on the outside — parent owns the state.
 */
export function FilterBar<TIndustry extends string, TCity extends string, TSort extends string>({
  industries,
  cities,
  sortOptions,
  industry,
  city,
  sort,
  resultCount,
  onChangeIndustry,
  onChangeCity,
  onChangeSort,
  onReset,
  sortLabel = "排序",
}: FilterBarProps<TIndustry, TCity, TSort>) {
  const hasFilter = industry !== "all" || city !== "all"

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-[#E5E7DB]/60 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center"
      data-testid="intelligence-filter-bar"
    >
      <div className="flex items-center gap-1 text-xs font-semibold text-[#6B7280]">
        <Filter className="size-3.5" />
        筛选
      </div>
      <Select
        label="行业"
        value={industry}
        onChange={(value) => onChangeIndustry(value as TIndustry | "all")}
        options={[{ value: "all", label: "全部行业" }, ...industries.map((i) => ({ value: i, label: i }))]}
        testId="filter-industry"
      />
      <Select
        label="城市"
        value={city}
        onChange={(value) => onChangeCity(value as TCity | "all")}
        options={[{ value: "all", label: "全部城市" }, ...cities.map((c) => ({ value: c, label: c }))]}
        testId="filter-city"
      />
      <Select
        label={sortLabel}
        value={sort}
        onChange={(value) => onChangeSort(value as TSort)}
        options={sortOptions as readonly { value: string; label: string }[]}
        testId="filter-sort"
      />
      <div className="ml-auto flex items-center gap-2 text-xs text-[#6B7280]">
        <span data-testid="intelligence-result-count">
          匹配 <strong className="text-[#111827]">{resultCount}</strong> 条
        </span>
        {hasFilter && onReset ? (
          <SolidButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            data-testid="filter-reset"
          >
            <X className="size-3.5" />
            重置
          </SolidButton>
        ) : null}
      </div>
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  testId,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
  testId?: string
}) {
  return (
    <label className="flex items-center gap-1.5 rounded-full bg-[#F1F5EF] px-3 py-1.5 text-xs text-[#374151]">
      <span className="font-semibold text-[#6B7280]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid={testId}
        className="border-0 bg-transparent pr-1 text-xs font-medium text-[#111827] outline-none focus:ring-0"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

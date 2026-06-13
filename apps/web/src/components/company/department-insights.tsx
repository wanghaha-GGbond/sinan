"use client"

import { useState } from "react"

import type { DepartmentInsight } from "@/lib/server/department-insights"
import { REVIEW_RATING_LABELS } from "@/lib/review-ratings"

export function DepartmentInsights({
  insights,
}: {
  insights: DepartmentInsight[]
}) {
  const [selectedId, setSelectedId] = useState(insights[0]?.id ?? "")
  if (insights.length === 0) return null

  const selected =
    insights.find((department) => department.id === selectedId) ?? insights[0]

  return (
    <section className="my-5 border-y border-border py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">部门体感</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            仅展示至少 5 名已核验作者的部门
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto" role="tablist">
          {insights.map((department) => (
            <button
              key={department.id}
              type="button"
              role="tab"
              aria-selected={selected.id === department.id}
              onClick={() => setSelectedId(department.id)}
              className={`min-h-11 shrink-0 border px-3 text-sm font-semibold ${
                selected.id === department.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {department.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        {Object.entries(selected.ratings).map(([key, value]) => (
          <div key={key} className="border-l-2 border-primary pl-3">
            <p className="text-xs text-muted-foreground">
              {REVIEW_RATING_LABELS[key as keyof typeof REVIEW_RATING_LABELS]}
            </p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {value.toFixed(1)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        {selected.reviewCount} 条评价 · {selected.verifiedAuthorCount} 名已核验作者
      </p>
    </section>
  )
}

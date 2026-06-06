"use client"

import { Slider } from "@/components/ui/slider"

export function RatingSlider({
  label,
  value,
  description,
  onChange,
}: {
  label: string
  value: number
  description?: string
  onChange: (value: number) => void
}) {
  return (
    <div className="rounded-xl border bg-card p-4 text-card-foreground">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <output
          className="min-w-12 rounded-lg bg-primary-hover px-2 py-1 text-center text-sm font-semibold text-primary-foreground"
          aria-label={`${label} 当前分数`}
        >
          {value.toFixed(1)}
        </output>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span className="text-xs text-muted-foreground">0</span>
        <Slider
          data-testid={`rating-slider-${label}`}
          min={0}
          max={10}
          step={0.5}
          value={[value]}
          onValueChange={(next) => onChange(Array.isArray(next) ? (next[0] ?? value) : next)}
        />
        <span className="text-xs text-muted-foreground">10</span>
      </div>
    </div>
  )
}

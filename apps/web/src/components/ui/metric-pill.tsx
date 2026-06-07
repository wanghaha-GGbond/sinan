export function MetricPill({ label, score }: { label: string; score: number | string }) {
  return (
    // @container lets this pill respond to its own width
    // (inherited from SolidCard's @container) instead of the
    // viewport. min-w-0 + truncate keeps the label from
    // wrapping when the pill is squeezed into a 3-col / 4-col
    // grid at narrow card widths.
    <div className="@container flex min-w-0 flex-col gap-0.5 rounded-2xl bg-muted px-3 py-2">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {typeof score === "number" ? score.toFixed(1) : score}
      </p>
    </div>
  )
}

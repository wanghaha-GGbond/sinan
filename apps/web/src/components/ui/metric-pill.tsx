export function MetricPill({ label, score }: { label: string; score: number | string }) {
  return (
    <div className="rounded-2xl bg-muted px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{typeof score === "number" ? score.toFixed(1) : score}</p>
    </div>
  )
}

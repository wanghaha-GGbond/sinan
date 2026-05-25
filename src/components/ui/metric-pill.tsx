export function MetricPill({ label, score }: { label: string; score: number | string }) {
  return (
    <div className="rounded-2xl bg-[#F1F5EF] px-3 py-2">
      <p className="text-xs text-[#6B7280]">{label}</p>
      <p className="text-sm font-medium text-[#1F2937]">{typeof score === "number" ? score.toFixed(1) : score}</p>
    </div>
  )
}

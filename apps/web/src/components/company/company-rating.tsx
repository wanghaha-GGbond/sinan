import { Star } from "lucide-react"

// The stored direction score remains on its original 0-10 scale.
export function companyDisplayScore(score: number | null | undefined, reviewCount: number) {
  return reviewCount > 0 && typeof score === "number" && Number.isFinite(score)
    ? Math.min(5, Math.max(0, score / 2))
    : null
}

export function CompanyRating({ score, prominent = false }: { score: number | null; prominent?: boolean }) {
  if (score === null) return <span className="text-sm text-muted-foreground">暂无评分</span>

  return (
    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400" aria-label={`方向评分 ${score.toFixed(1)} 分，满分 5 分`}>
      {prominent ? (
        <span className="mr-1 inline-flex items-center gap-0.5" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} className="relative size-4 text-emerald-200 dark:text-emerald-900">
              <Star className="size-4" />
              <span className="absolute inset-0 overflow-hidden text-emerald-700 dark:text-emerald-400" style={{ width: `${Math.max(0, Math.min(1, score - index)) * 100}%` }}>
                <Star className="size-4 max-w-none fill-current" />
              </span>
            </span>
          ))}
        </span>
      ) : <Star className="size-4 fill-current" aria-hidden="true" />}
      <span className={`${prominent ? "text-3xl" : "text-sm"} font-semibold tabular-nums`}>{score.toFixed(1)}</span>
      <span className="text-sm font-normal text-muted-foreground">/ 5</span>
    </span>
  )
}

// Presentation only: keep the API/database direction score on its 0–10 scale.
export function companyDisplayScore(score: number | null | undefined, reviewCount: number) {
  return reviewCount > 0 && typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 10
    ? score
    : null
}

export function CompanyRating({ score, prominent = false }: { score: number | null; prominent?: boolean }) {
  if (score === null) return <span className="text-sm text-muted-foreground">暂无评分</span>
  return (
    <span className="inline-flex items-baseline gap-1 text-primary-deep" aria-label={`方向评分 ${score.toFixed(1)} 分，满分 10 分`}>
      <span className={`${prominent ? "text-3xl" : "text-sm"} font-semibold tabular-nums`}>{score.toFixed(1)}</span>
      <span className="text-sm font-normal text-muted-foreground">/ 10</span>
    </span>
  )
}

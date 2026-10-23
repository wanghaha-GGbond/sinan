export function CompanyListSkeleton() {
  return (
    <div role="status" aria-label="正在加载公司" className="border-t border-border">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-4 border-b border-border py-6" aria-hidden="true">
          <div className="size-12 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-44 animate-pulse rounded bg-muted" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

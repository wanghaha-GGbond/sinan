export function CompanyListSkeleton({ variant = "feed" }: { variant?: "feed" | "directory" }) {
  if (variant === "directory") {
    return (
      <div role="status" aria-label="正在加载公司" aria-busy="true">
        <div className="h-36 rounded-lg border border-border bg-card p-5 sm:h-24" aria-hidden="true">
          <div className="h-12 w-full animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
        </div>
        <div className="my-5 h-5 w-28 animate-pulse rounded bg-card motion-reduce:animate-none" aria-hidden="true" />
        <div data-testid="directory-loading-grid" className="grid gap-3 sm:gap-4 lg:grid-cols-2" aria-hidden="true">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="min-w-0 space-y-5 rounded-lg border border-border bg-card p-5 sm:p-6">
              <div className="flex gap-4">
                <div className="size-14 shrink-0 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
                </div>
              </div>
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="flex justify-between gap-4"><div className="h-11 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" /><div className="h-11 w-24 animate-pulse rounded-full bg-muted motion-reduce:animate-none" /></div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div role="status" aria-label="正在加载公司" className="border-t border-border">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-4 border-b border-border py-6" aria-hidden="true">
          <div className="size-12 shrink-0 animate-pulse motion-reduce:animate-none rounded-lg bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-32 animate-pulse motion-reduce:animate-none rounded bg-muted" />
            <div className="h-4 w-44 animate-pulse motion-reduce:animate-none rounded bg-muted" />
            <div className="h-4 w-28 animate-pulse motion-reduce:animate-none rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

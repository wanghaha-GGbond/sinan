export default function CompanyLoading() {
  return <section className="mx-auto w-full max-w-page px-4 py-8 sm:px-6" role="status" aria-label="正在加载公司信息">
    <p className="sr-only">正在加载公司信息</p>
    <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
      <div className="h-44 rounded-lg border border-border bg-muted" />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]"><div className="h-80 rounded-lg border border-border bg-muted" /><div className="h-60 rounded-lg border border-border bg-muted" /></div>
    </div>
  </section>
}

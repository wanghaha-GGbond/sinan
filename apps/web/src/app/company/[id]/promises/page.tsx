import { notFound } from "next/navigation"
import { CompanyPageHeader } from "@/components/company/company-page-header"
import { PromiseRecords } from "@/components/company/promise-records"
import { ErrorState } from "@/components/common/error-state"
import { getPublicCompanyDetail } from "@/lib/server/public-company-data"
import { PromiseForm } from "./promise-form"

export default async function CompanyPromisesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let company
  try { company = await getPublicCompanyDetail(id) }
  catch { return <ErrorState title="公司信息加载失败" message="请稍后重试。" /> }
  if (!company) notFound()
  return <section className="min-h-[calc(100vh-160px)] bg-muted px-4 py-4 sm:px-8 sm:py-6"><div className="mx-auto w-full max-w-page">
    <CompanyPageHeader company={company} active="承诺" />
    <div className="mt-6 grid items-start gap-6 min-[1200px]:grid-cols-2">
      <div className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-7"><PromiseRecords companyId={id} showEmpty /></div>
      <div className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-7"><PromiseForm key={id} companyId={id} companyName={company.name} /></div>
    </div>
  </div></section>
}

import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getPublicCompanyDetail } from "@/lib/server/public-company-data"
import { ErrorState } from "@/components/common/error-state"
import { CompanyPageHeader } from "@/components/company/company-page-header"
import { ForumHub } from "@/components/forum/forum-hub"
export default async function CompanyForum({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let company
  try { company = await getPublicCompanyDetail(id) } catch { return <ErrorState title="公司信息加载失败" message="请稍后重试。" /> }
  if (!company) notFound()
  return <section className="bg-muted px-4 py-5 sm:px-8"><div className="mx-auto max-w-page"><CompanyPageHeader company={company} active="论坛" /><Suspense fallback={<p className="p-5" role="status">正在加载论坛…</p>}><ForumHub company={company} /></Suspense></div></section>
}

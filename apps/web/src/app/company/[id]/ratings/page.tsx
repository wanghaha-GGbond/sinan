import { RatingsClient } from "@/app/company/[id]/ratings/ratings-client"
import { notFound } from "next/navigation"
import { ErrorState } from "@/components/common/error-state"
import { getPublicCompanyDetail } from "@/lib/server/public-company-data"

export default async function CompanyRatingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let company
  try { company = await getPublicCompanyDetail(id) }
  catch { return <ErrorState title="评分暂时不可用" message="请稍后重试。" /> }
  if (!company) notFound()
  return <RatingsClient company={company} />
}

import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { CompanyReviewFeed } from "@/components/company/company-review-feed"
import { EmptyState } from "@/components/common/state-blocks"
import { SolidButton } from "@/components/ui/solid-button"
import { getCompany } from "@/lib/mock-data"

export default async function CompanyReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const company = getCompany(id)

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SolidButton asChild variant="ghost">
            <Link href={`/company/${company.id}`}>
            <ChevronLeft />
            返回公司页
            </Link>
          </SolidButton>
          <p className="text-sm text-muted-foreground">{company.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">公司评价阅读区</h1>
          <p className="mt-3 text-muted-foreground">高赞真实体验、低分体验与风险评价统一按匿名保护规则展示。</p>
        </div>
        <SolidButton asChild><Link href="/submit/review">发布评价</Link></SolidButton>
      </div>
      {company.reviews.length === 0 ? (
        <EmptyState />
      ) : (
        <CompanyReviewFeed companyId={company.id} reviews={company.reviews} />
      )}
    </section>
  )
}

import Link from "next/link"
import { PenLine } from "lucide-react"

import { CompanyIntelligencePanel } from "@/components/company/company-intelligence-panel"
import { CompanyReviewFeed } from "@/components/company/company-review-feed"
import { EmptyState } from "@/components/common/state-blocks"
import { Badge } from "@/components/ui/badge"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { getCompany } from "@/lib/api/companies"
import { getReviews } from "@/lib/api/reviews"
import type { Review } from "@/lib/types"
import type { ReviewListItem } from "@/lib/api/types"

function mapToReview(item: ReviewListItem): Review {
  const rawEmployment = item.employmentStatus ?? ""
  const relationMap: Record<string, Review["relation"]> = {
    "在职员工": "在职员工",
    "离职员工": "离职员工",
    "面试者": "面试者",
    "实习生": "实习生",
    "外包 / 派遣": "外包 / 派遣",
  }
  const relation = (relationMap[rawEmployment] ?? "面试者") as Review["relation"]

  return {
    id: item.id,
    companyId: item.companyId,
    role: "匿名评价者",
    relation,
    tenure: "",
    score: Number(item.directionScore),
    title: item.title,
    content: item.content ?? item.summary ?? item.title,
    tags: item.tags ?? [],
    helpful: item.usefulCount,
    commentCount: item.discussionCount,
    shortComment: item.title,
    jobCategory: item.jobTitle ?? "",
    employmentStatus: (rawEmployment || "面试者") as Review["employmentStatus"],
    trustLevel: 3,
    city: item.city ?? "未知",
    comments: [],
    createdAt: item.createdAt,
    verifiedHint: "",
  }
}

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [companyRes, reviewsRes] = await Promise.all([
    getCompany(id),
    getReviews({ companyId: id }),
  ])

  if (companyRes.loading || reviewsRes.loading) {
    return (
      <section className="mx-auto flex w-full max-w-[920px] items-center justify-center px-4 py-20 sm:px-6">
        <div className="flex flex-col items-center gap-3 text-sm text-[#6B7280]">
          <div className="size-8 animate-spin rounded-full border-2 border-[#19C37D] border-t-transparent" />
          <span>加载中…</span>
        </div>
      </section>
    )
  }

  if (companyRes.error) {
    return (
      <section className="mx-auto w-full max-w-[760px] px-4 py-10 sm:px-6">
        <SolidCard variant="subtle" className="p-6">
          <h1 className="text-2xl font-semibold text-[#111827]">加载失败</h1>
          <p className="mt-3 text-sm text-[#6B7280]">{companyRes.error}</p>
          <div className="mt-5">
            <SolidButton asChild variant="primary">
              <Link href="/">返回首页</Link>
            </SolidButton>
          </div>
        </SolidCard>
      </section>
    )
  }

  const company = companyRes.data!.company
  const mappedReviews: Review[] = (reviewsRes.data?.reviews ?? []).map(mapToReview)

  if (company.reviewStatus === "pending_review") {
    return (
      <section className="mx-auto w-full max-w-[760px] px-4 py-10 sm:px-6">
        <SolidCard variant="subtle" className="p-6" data-testid="company-pending-review-page">
          <p className="text-sm font-medium text-[#6B7280]">{company.name}</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#111827]">该公司信息待审核</h1>
          <p className="mt-3 text-sm leading-6 text-[#6B7280]">
            已有用户提交公司注册信息，审核通过后即可评价。审核前不展示方向分、公司体感和评论流。
          </p>
          <div className="mt-5">
            <SolidButton asChild variant="primary">
              <Link href="/">返回推荐</Link>
            </SolidButton>
          </div>
        </SolidCard>
      </section>
    )
  }

  // riskTags/highlights are in CompanyListItem; vibeTag/scoreOfficeExperience/scoreCanteen are not
  // pass as unknown→Company to CompanyIntelligencePanel — panel uses riskTags and scoreOfficeExperience
  // no-ops on missing fields at runtime
  // @ts-expect-error CompanyListItem is a partial shape of Company; runtime data is sufficient
  const companyForPanel: Parameters<typeof CompanyIntelligencePanel>[0]["company"] = company as Parameters<
    typeof CompanyIntelligencePanel
  >[0]["company"]

  return (
    <section className="mx-auto w-full max-w-[920px] px-4 py-4 sm:px-6">
      <div
        data-testid="company-sticky-header"
        className="glass-panel sticky top-14 z-40 mb-4 rounded-3xl border border-[#E5E7DB]/70 px-4 py-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-[#111827] sm:text-lg">{company.name}</h1>
            <p className="truncate text-xs text-[#6B7280] sm:text-sm">
              {company.industry} · {company.city} · 方向分 {(company.directionScore ?? 0).toFixed(1)} · {(company.reviewCount ?? 0)} 条评价
            </p>
            {/* vibeTag not returned by API */}
          </div>
          <SolidButton asChild size="sm">
            <Link href={`/submit/review?companyId=${company.id}`}>
            <PenLine />
            匿名评价
            </Link>
          </SolidButton>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-[#F1F5EF] px-3 py-2 text-xs text-[#6B7280] sm:text-sm">
        <span>方向分 {(company.directionScore ?? 0).toFixed(1)}</span>
        <span>｜</span>
        <span>推荐入职率 {(company.recommendationRate ?? 0)}%</span>
        <span>｜</span>
        <span>{(company.reviewCount ?? 0)} 条评价</span>
        {(company.riskTags ?? []).slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary">
            #{tag}
          </Badge>
        ))}
      </div>

      <CompanyIntelligencePanel company={companyForPanel} />

      {mappedReviews.length === 0 ? (
        <EmptyState />
      ) : (
        <div data-testid="company-review-feed" className="min-w-0">
          <CompanyReviewFeed companyId={company.id} reviews={mappedReviews} />
        </div>
      )}
    </section>
  )
}
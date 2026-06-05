"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  CheckCircle2,
  Clock,
  EyeOff,
  Lock,
  ShieldAlert,
  Tag,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { SolidEmptyState } from "@/components/ui/solid-empty-state"
import { Textarea } from "@/components/ui/textarea"
import { ScoreChip } from "@/components/ui/score-chip"
import { TagPill } from "@/components/ui/tag-pill"
import {
  APPEAL_REASONS,
  CORRECTION_FIELDS,
  listAppeals,
  listCorrections,
  submitAppeal,
  submitCorrection,
  type AppealReasonId,
  type CompanyAppealRequest,
  type CompanyCorrectionRequest,
} from "@/lib/company-portal-storage"
import { companies } from "@/lib/mock-data"
import { notFound } from "next/navigation"

const CLAIMED_COMPANY_IDS = new Set(["northstar-tech", "polaris-auto"])

export default function CompanyPortalDetailPage() {
  const params = useParams<{ companyId: string }>()
  const companyId = params?.companyId ?? ""
  const company = useMemo(() => companies.find((c) => c.id === companyId), [companyId])

  const [corrections, setCorrections] = useState<CompanyCorrectionRequest[]>([])
  const [appeals, setAppeals] = useState<CompanyAppealRequest[]>([])

  // Hydrate localStorage-backed queues. Same reasoning as /me.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCorrections(listCorrections(companyId))
    setAppeals(listAppeals(companyId))
  }, [companyId])

  if (!company) {
    notFound()
  }

  // Block access to companies that aren't "claimed" in this mock.
  if (!CLAIMED_COMPANY_IDS.has(company.id)) {
    return (
      <SolidEmptyState
        title="你还没有认领这家公司"
        description="请先通过公司控制台首页提交认领,审核通过后才能进入查看。 "
        action={
          <SolidButton asChild variant="primary">
            <Link href="/company-portal">返回控制台</Link>
          </SolidButton>
        }
      />
    )
  }

  const trend = company.trend
  const trendDelta = trend.length >= 2 ? trend[trend.length - 1].score - trend[0].score : 0
  const scores = trend.map((point) => point.score)
  const maxScore = Math.max(...scores, 10)
  const minScore = Math.min(...scores, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-[#6B7280]">{company.industry} · {company.city} · {company.size}</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#111827]">{company.shortName}</h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            这是你在司南上能看到的镜像。所有评价、评分、趋势由匿名打工人贡献,司南不向公司端开放用户身份。
          </p>
        </div>
        <ScoreChip score={company.directionScore} />
      </div>

      {/* Stat row */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="方向分"
          value={company.directionScore.toFixed(1)}
          sub="来自匿名评价"
          tone="primary"
        />
        <StatCard
          label="推荐入职率"
          value={`${company.recommendationRate}%`}
          sub={`${company.reviewCount.toLocaleString()} 条评价`}
          tone="neutral"
        />
        <StatCard
          label="近 30 天变化"
          value={`${trendDelta >= 0 ? "+" : ""}${trendDelta.toFixed(1)}`}
          sub={trend.length > 0 ? `数据点 ${trend.length} 个月` : "数据补充中"}
          tone={trendDelta >= 0 ? "positive" : "risk"}
          icon={trendDelta >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
        />
        <StatCard
          label="公开评价"
          value={company.reviewCount.toLocaleString()}
          sub="公司端只能查看"
          tone="neutral"
          icon={<EyeOff className="size-4" />}
        />
      </div>

      {/* Trend chart */}
      <SolidCard variant="subtle" className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111827]">方向分趋势</h2>
          <span className="text-xs text-[#6B7280]">最近 {trend.length} 个月</span>
        </div>
        {trend.length === 0 ? (
          <p className="rounded-2xl bg-[#F9FAF7] p-4 text-sm text-[#6B7280]">数据补充中。</p>
        ) : (
          <div className="flex h-40 items-end gap-2" data-testid="portal-trend-chart">
            {trend.map((point, index) => {
              const ratio = (point.score - minScore) / (maxScore - minScore || 1)
              const heightPx = Math.max(8, Math.round(ratio * 140))
              return (
                <div key={`${point.month}-${index}`} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-[#111827]">{point.score.toFixed(1)}</span>
                  <div
                    className="w-full rounded-t-md bg-[#19C37D]"
                    style={{ height: `${heightPx}px` }}
                    title={`${point.month} · ${point.reviews} 条评价`}
                  />
                  <span className="text-xs text-[#6B7280]">{point.month}</span>
                </div>
              )
            })}
          </div>
        )}
      </SolidCard>

      {/* Two-column: tags + dimensions */}
      <div className="grid gap-4 md:grid-cols-2">
        <SolidCard variant="subtle" className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Tag className="size-4 text-[#19C37D]" />
            <h2 className="text-base font-semibold text-[#111827]">风险标签</h2>
          </div>
          {company.riskTags.length === 0 ? (
            <p className="text-sm text-[#6B7280]">暂无风险标签。</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {company.riskTags.map((tag) => (
                <TagPill
                  key={tag}
                  tone={tag.includes("压力") || tag.includes("波动") ? "risk" : "neutral"}
                >
                  #{tag}
                </TagPill>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-[#6B7280]">
            司南自动从公开评价中提取高频风险标签,公司端不能修改或删除。
          </p>
        </SolidCard>

        <SolidCard variant="subtle" className="p-5">
          <h2 className="mb-3 text-base font-semibold text-[#111827]">分维度评分</h2>
          <div className="grid gap-3">
            {company.dimensions.map((dim) => (
              <div key={dim.key} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111827]">{dim.label}</p>
                  <p className="text-xs text-[#6B7280]">{dim.description}</p>
                </div>
                <span className="text-sm font-semibold text-[#111827]">{dim.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </SolidCard>
      </div>

      {/* Read-only public reviews */}
      <SolidCard variant="subtle" className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111827]">公开评价(只读)</h2>
          <span className="text-xs text-[#6B7280]">{company.reviews.length} 条</span>
        </div>
        <p className="mb-3 text-xs text-[#6B7280]">
          公司端只能浏览,不能点赞、回复、删改。对内容有异议时,请在每条评价上点击「提交申诉」。
        </p>
        <div className="grid gap-3" data-testid="portal-reviews-list">
          {company.reviews.slice(0, 6).map((review) => {
            const reviewAppeals = appeals.filter((a) => a.reviewId === review.id)
            return (
              <div
                key={review.id}
                className="rounded-2xl border border-[#E5E7DB]/60 bg-[#F9FAF7] p-4"
                data-testid={`portal-review-${review.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="line-clamp-1 text-sm font-semibold text-[#111827]">{review.shortComment}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#111827]">
                    {review.score} 分
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#374151]">{review.content}</p>
                <p className="mt-2 text-xs text-[#6B7280]">
                  {review.relation} · {review.jobCategory} · {review.city} · {review.createdAt}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {reviewAppeals.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF1D6] px-2 py-0.5 text-xs text-[#92400E]">
                        <ShieldAlert className="size-3" />
                        已申诉 {reviewAppeals.length} 次
                      </span>
                    ) : null}
                  </div>
                  <AppealButton companyId={company.id} reviewId={review.id} />
                </div>
              </div>
            )
          })}
        </div>
      </SolidCard>

      {/* Submission queue: company info corrections */}
      <SolidCard variant="subtle" className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111827]">公司信息修正</h2>
          <span className="text-xs text-[#6B7280]">{corrections.length} 条提交</span>
        </div>
        <p className="mb-3 text-xs text-[#6B7280]">
          这里是你提交过的工商信息修正申请。司南审核通过后会在公开页更新。
        </p>
        <CorrectionForm company={company} onSubmitted={(c) => setCorrections([c, ...corrections])} />
        {corrections.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {corrections.slice(0, 5).map((correction) => (
              <div
                key={correction.id}
                className="flex items-start justify-between gap-3 rounded-2xl bg-[#F9FAF7] p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111827]">
                    {CORRECTION_FIELDS.find((f) => f.value === correction.field)?.label ?? correction.field}
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    <span className="line-through">{correction.currentValue}</span>
                    {" → "}
                    <span className="font-semibold text-[#111827]">{correction.proposedValue}</span>
                  </p>
                  {correction.reason ? (
                    <p className="mt-1 text-xs text-[#6B7280]">说明:{correction.reason}</p>
                  ) : null}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#DFF8EC] px-2 py-0.5 text-xs text-[#07563A]">
                  <Clock className="size-3" />
                  审核中
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </SolidCard>

      {/* Read-only public link */}
      <div className="rounded-2xl border border-[#E5E7DB]/60 bg-white p-4 text-sm text-[#6B7280]">
        <p>
          想看公开镜像(打工人视角)?点
          <Link href={`/company/${company.id}`} className="mx-1 font-semibold text-[#19C37D] hover:underline">
            公开页
          </Link>
          查看。
        </p>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string
  value: string
  sub: string
  tone: "primary" | "neutral" | "positive" | "risk"
  icon?: React.ReactNode
}) {
  const accent = {
    primary: "bg-[#DFF8EC] text-[#07563A]",
    neutral: "bg-[#F1F5EF] text-[#374151]",
    positive: "bg-[#DFF8EC] text-[#07563A]",
    risk: "bg-[#FFF1D6] text-[#92400E]",
  }[tone]
  return (
    <SolidCard variant="subtle" className="p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-[#6B7280]">
        <span className={`inline-flex size-6 items-center justify-center rounded-md ${accent}`}>
          {icon ?? <Lock className="size-3" />}
        </span>
        {label}
      </div>
      <p className="text-2xl font-semibold text-[#111827]">{value}</p>
      <p className="mt-1 text-xs text-[#6B7280]">{sub}</p>
    </SolidCard>
  )
}

function CorrectionForm({
  company,
  onSubmitted,
}: {
  company: { id: string; name: string; registeredName?: string; industry: string; city: string; size: string; stage: string; description?: string | null; website?: string | null }
  onSubmitted: (c: CompanyCorrectionRequest) => void
}) {
  const [field, setField] = useState<CompanyCorrectionRequest["field"]>("name")
  const [proposed, setProposed] = useState("")
  const [reason, setReason] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const currentValue = useMemo(() => {
    if (field === "name") return company.name
    if (field === "registeredName") return company.registeredName ?? ""
    if (field === "industry") return company.industry
    if (field === "city") return company.city
    if (field === "size") return company.size
    if (field === "stage") return company.stage
    if (field === "description") return company.description ?? ""
    if (field === "website") return company.website ?? ""
    return ""
  }, [field, company])

  function handleSubmit() {
    if (!proposed.trim()) return
    const correction = submitCorrection({
      companyId: company.id,
      field,
      currentValue,
      proposedValue: proposed.trim(),
      reason: reason.trim(),
    })
    onSubmitted(correction)
    setSubmitted(true)
    setProposed("")
    setReason("")
    setTimeout(() => setSubmitted(false), 2500)
  }

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-[#E5E7DB]">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#6B7280]">
          修正字段
          <select
            value={field}
            onChange={(event) => setField(event.target.value as CompanyCorrectionRequest["field"])}
            data-testid="correction-field-select"
            className="rounded-xl border border-[#E5E7DB] bg-white px-3 py-2 text-sm font-normal text-[#111827] outline-none focus:border-[#19C37D] focus:ring-4 focus:ring-[#DFF8EC]"
          >
            {CORRECTION_FIELDS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-[#9CA3AF]">
            {CORRECTION_FIELDS.find((f) => f.value === field)?.description}
          </span>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#6B7280]">
          建议值
          <input
            type="text"
            value={proposed}
            onChange={(event) => setProposed(event.target.value)}
            placeholder="例如:北辰智造科技(上海)有限公司"
            data-testid="correction-proposed-input"
            className="rounded-xl border border-[#E5E7DB] bg-white px-3 py-2 text-sm font-normal text-[#111827] outline-none focus:border-[#19C37D] focus:ring-4 focus:ring-[#DFF8EC]"
          />
          <span className="text-xs font-normal text-[#9CA3AF]">当前:{currentValue || "(空)"}</span>
        </label>
      </div>
      <Textarea
        rows={2}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="修正原因(选填,提供证据链接/截图说明更易通过)"
        className="mt-3"
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        {submitted ? (
          <span className="inline-flex items-center gap-1 text-xs text-[#07563A]">
            <CheckCircle2 className="size-3.5" />
            已提交,等待审核
          </span>
        ) : null}
        <SolidButton
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!proposed.trim()}
          data-testid="correction-submit"
        >
          提交修正
        </SolidButton>
      </div>
    </div>
  )
}

function AppealButton({ companyId, reviewId }: { companyId: string; reviewId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<AppealReasonId | "">("")
  const [note, setNote] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (!reason) return
    submitAppeal({ companyId, reviewId, reason, note })
    setSubmitted(true)
    setOpen(false)
    setReason("")
    setNote("")
  }

  if (submitted) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#DFF8EC] px-2.5 py-1 text-xs text-[#07563A]">
        <CheckCircle2 className="size-3" />
        申诉已提交
      </span>
    )
  }

  if (!open) {
    return (
      <SolidButton
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid={`appeal-button-${reviewId}`}
      >
        <ShieldAlert className="size-3.5" />
        提交申诉
      </SolidButton>
    )
  }

  return (
    <div className="w-full rounded-2xl border border-[#E5E7DB] bg-white p-3">
      <p className="mb-2 text-xs font-semibold text-[#111827]">对这条评价提交申诉</p>
      <div className="grid gap-1.5">
        {APPEAL_REASONS.map((option) => {
          const selected = reason === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setReason(option.id)}
              data-testid={`appeal-reason-${reviewId}-${option.id}`}
              className={`rounded-lg border px-2 py-1.5 text-left text-xs ${
                selected
                  ? "border-[#C76A15] bg-[#FFF1D6] text-[#92400E]"
                  : "border-[#E5E7DB] bg-white text-[#374151] hover:border-[#C76A15]/40"
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <Textarea
        rows={2}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="补充说明 / 举证(选填)"
        className="mt-2"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <SolidButton type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          取消
        </SolidButton>
        <SolidButton
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!reason}
          data-testid={`appeal-submit-${reviewId}`}
        >
          提交
        </SolidButton>
      </div>
    </div>
  )
}

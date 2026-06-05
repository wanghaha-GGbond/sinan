"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Flag, X } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { Textarea } from "@/components/ui/textarea"
import { REPORT_REASONS, getReportForReview, submitReport, type ReportReasonId } from "@/lib/api/reports"

export function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReasonId | "">("")
  const [note, setNote] = useState("")
  // null = "not yet checked" (SSR / pre-mount), a real id = "already reported".
  const [submittedReason, setSubmittedReason] = useState<ReportReasonId | null>(null)

  // Hydrate "already reported" state after mount. localStorage is client-only,
  // so this cannot be replaced by useSyncExternalStore without hoisting a
  // global store; the cascading render only happens once on first mount.
  useEffect(() => {
    const existing = getReportForReview(reviewId)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (existing) setSubmittedReason(existing.reason)
  }, [reviewId])

  if (submittedReason && !open) {
    const label = REPORT_REASONS.find((r) => r.id === submittedReason)?.label ?? "已举报"
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-[#F1F5EF] px-3 py-1.5 text-xs font-medium text-[#07563A]"
        data-testid={`report-submitted-${reviewId}`}
        title="你已经举报过这条评价,司南会优先审核"
      >
        <CheckCircle2 className="size-3.5" />
        已举报:{label}
      </span>
    )
  }

  if (!open) {
    return (
      <SolidButton
        type="button"
        variant="risk"
        size="sm"
        className="rounded-full"
        data-testid={`report-button-${reviewId}`}
        onClick={() => setOpen(true)}
      >
        <Flag className="size-4" />
        举报
      </SolidButton>
    )
  }

  function handleSubmit() {
    if (!reason) return
    const chosenReason = reason as ReportReasonId
    setSubmittedReason(chosenReason)
    setOpen(false)
    setReason("")
    setNote("")
    void submitReport({ reviewId, reason: chosenReason, note }).then(
      (result) => {
        // Optimistic UI was already set; only roll back on a real error.
        if (result.error) {
          setSubmittedReason(null)
        }
      }
    )
  }

  return (
    <div
      className="mt-3 w-full rounded-2xl border border-[#E5E7DB] bg-[#F9FAF7] p-4"
      data-testid={`report-form-${reviewId}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[#111827]">举报这条评价</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full p-1 text-[#9CA3AF] hover:bg-white hover:text-[#6B7280]"
          aria-label="关闭举报"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mb-3 text-xs text-[#6B7280]">
        司南优先保护匿名与事实表达。明确违规的内容会被下架,公司方无法干预。
      </p>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="举报原因">
        {REPORT_REASONS.map((option) => {
          const selected = reason === option.id
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`report-reason-${option.id}`}
              onClick={() => setReason(option.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                selected
                  ? "border-[#C76A15] bg-[#FFF1D6] text-[#92400E]"
                  : "border-[#E5E7DB] bg-white text-[#374151] hover:border-[#C76A15]/40"
              }`}
            >
              <span
                className={`size-3 rounded-full border-2 ${
                  selected ? "border-[#C76A15] bg-[#C76A15]" : "border-[#D1D5DB]"
                }`}
              />
              {option.label}
            </button>
          )
        })}
      </div>
      <Textarea
        className="mt-3"
        rows={3}
        maxLength={200}
        placeholder="补充说明(选填),不超过 200 字"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        <SolidButton type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          取消
        </SolidButton>
        <SolidButton
          type="button"
          variant="primary"
          size="sm"
          disabled={!reason}
          onClick={handleSubmit}
          data-testid={`report-submit-${reviewId}`}
        >
          提交举报
        </SolidButton>
      </div>
    </div>
  )
}

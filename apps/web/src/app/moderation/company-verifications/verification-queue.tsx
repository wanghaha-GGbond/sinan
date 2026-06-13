"use client"

import { useEffect, useState } from "react"
import { BadgeCheck, Check, Loader2, RefreshCw, X } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { Textarea } from "@/components/ui/textarea"

type Status = "submitted" | "reviewing" | "approved" | "rejected" | "revoked"

type Verification = {
  id: string
  companyName: string
  companyShortName: string | null
  applicant: {
    id: string
    name: string
    displayName: string | null
    trustLevel: number
  }
  workEmail: string
  jobTitle: string
  proofType: "work_email" | "business_document"
  note: string | null
  status: Status
  createdAt: string
}

const statuses: Array<{ value: Status; label: string }> = [
  { value: "submitted", label: "待处理" },
  { value: "reviewing", label: "人工复核" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已拒绝" },
  { value: "revoked", label: "已吊销" },
]

export function VerificationQueue() {
  const [status, setStatus] = useState<Status>("submitted")
  const [rows, setRows] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reasonById, setReasonById] = useState<Record<string, string>>({})
  const [actingId, setActingId] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    let active = true
    fetch(`/api/moderation/company-verifications?status=${status}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? "加载失败")
        return result.verifications as Verification[]
      })
      .then((verifications) => {
        if (active) setRows(verifications)
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "加载失败")
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [status, refreshNonce])

  function changeStatus(nextStatus: Status) {
    setLoading(true)
    setError("")
    setStatus(nextStatus)
  }

  function refresh() {
    setLoading(true)
    setError("")
    setRefreshNonce((current) => current + 1)
  }

  async function act(
    verification: Verification,
    action: "approve" | "reject"
  ) {
    const rejectReason = reasonById[verification.id]?.trim()
    if (action === "reject" && !rejectReason) {
      setError("拒绝申请前请填写原因")
      return
    }

    setActingId(verification.id)
    setError("")
    try {
      const response = await fetch(
        `/api/moderation/company-verifications/${verification.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "approve" ? { action } : { action, rejectReason }
          ),
        }
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "操作失败")
      setRows((current) => current.filter((row) => row.id !== verification.id))
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "操作失败")
    } finally {
      setActingId(null)
    }
  }

  return (
    <section className="mx-auto w-full max-w-page px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <BadgeCheck className="size-4" />
            身份审核
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            公司认证队列
          </h1>
        </div>
        <SolidButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={refresh}
          disabled={loading}
          aria-label="刷新审核队列"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </SolidButton>
      </header>

      <div className="mt-5 flex gap-2 overflow-x-auto" role="tablist">
        {statuses.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={status === item.value}
            onClick={() => changeStatus(item.value)}
            className={`min-h-11 shrink-0 border px-4 text-sm font-semibold ${
              status === item.value
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-5 border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          当前队列为空
        </p>
      ) : (
        <div className="mt-6 divide-y divide-border border-y border-border">
          {rows.map((verification) => {
            const pending =
              verification.status === "submitted" ||
              verification.status === "reviewing"
            return (
              <article key={verification.id} className="grid gap-5 py-6 lg:grid-cols-[1fr_320px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">
                      {verification.companyName}
                    </h2>
                    <span className="border border-border px-2 py-1 text-xs text-muted-foreground">
                      {verification.proofType === "work_email"
                        ? "企业邮箱"
                        : "任职证明"}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">申请人</dt>
                      <dd className="mt-1 font-medium text-foreground">
                        {verification.applicant.name} · {verification.jobTitle}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">联系邮箱</dt>
                      <dd className="mt-1 break-all font-medium text-foreground">
                        {verification.workEmail}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">当前可信度</dt>
                      <dd className="mt-1 font-medium text-foreground">
                        {verification.applicant.trustLevel}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">提交时间</dt>
                      <dd className="mt-1 font-medium text-foreground">
                        {new Date(verification.createdAt).toLocaleString("zh-CN")}
                      </dd>
                    </div>
                  </dl>
                  {verification.note ? (
                    <div className="mt-4 border-l-2 border-primary pl-3 text-sm leading-6 text-muted-foreground">
                      {verification.note}
                    </div>
                  ) : null}
                </div>

                {pending ? (
                  <div className="space-y-3">
                    <Textarea
                      value={reasonById[verification.id] ?? ""}
                      onChange={(event) =>
                        setReasonById((current) => ({
                          ...current,
                          [verification.id]: event.target.value,
                        }))
                      }
                      placeholder="拒绝原因或审核备注"
                      className="min-h-24"
                      maxLength={500}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <SolidButton
                        type="button"
                        variant="secondary"
                        disabled={actingId === verification.id}
                        onClick={() => void act(verification, "reject")}
                      >
                        <X className="size-4" />
                        拒绝
                      </SolidButton>
                      <SolidButton
                        type="button"
                        variant="primary"
                        disabled={actingId === verification.id}
                        onClick={() => void act(verification, "approve")}
                      >
                        <Check className="size-4" />
                        通过
                      </SolidButton>
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

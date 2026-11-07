"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { withNext } from "@/lib/navigation"

import { WebButton } from "@/components/ui/web-button"
import { Textarea } from "@/components/ui/textarea"

export function PromiseForm({ companyId: id, companyName }: { companyId: string; companyName: string }) {
  const { user, loading } = useAuth()
  const busy = useRef(false)
  const [category, setCategory] = useState("薪酬")
  const [promiseText, setPromiseText] = useState("")
  const [promiseDate, setPromiseDate] = useState("")
  const [outcomeText, setOutcomeText] = useState("")
  const [outcomeStatus, setOutcomeStatus] = useState("")
  const [evidenceType, setEvidenceType] = useState("offer")
  const [evidenceReference, setEvidenceReference] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const loginHref = withNext("/login", `/company/${encodeURIComponent(id)}/promises`)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current || !user || (user.trustLevel ?? 0) < 2) return
    busy.current = true
    setError(null)
    setSubmitting(true)
    try {
      const response = await fetch("/api/promise-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: id,
          promiseCategory: category,
          promiseText,
          promiseDate,
          outcomeText,
          outcomeStatus,
          evidenceType,
          evidenceReference,
        }),
      })
      const result = await response.json().catch(() => ({ error: "提交暂时不可用，请重试" }))
      if (!response.ok) throw new Error(result.error ?? "提交失败")
      if (!result.record?.id || result.record.status !== "pending_review") throw new Error("未能确认提交结果，请稍后查看")
      setSubmitted(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : "提交失败，请重试")
    } finally {
      setSubmitting(false)
      busy.current = false
    }
  }

  const inputClass = "mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"

  if (loading) return <p role="status" className="py-6 text-sm text-muted-foreground">正在检查登录状态…</p>
  if (!user) return <div className="py-6"><h2 className="text-lg font-semibold">记录你的经历</h2><p className="mt-2 text-sm text-muted-foreground">登录并完成任职证明后，可提交承诺记录。</p><WebButton asChild className="mt-4"><Link href={loginHref}>登录后继续</Link></WebButton></div>
  if ((user.trustLevel ?? 0) < 2) return <div className="py-6"><h2 className="text-lg font-semibold">先完成任职证明</h2><p className="mt-2 text-sm text-muted-foreground">承诺记录仅接受已验证员工提交。</p><WebButton asChild className="mt-4"><Link href={`/company-verification?companyId=${encodeURIComponent(id)}&companyName=${encodeURIComponent(companyName)}`}>去验证任职信息</Link></WebButton></div>
  if (submitted) return <div role="status" className="py-6"><h2 className="text-lg font-semibold">已提交，等待审核</h2><p className="mt-2 text-sm text-muted-foreground">审核通过后会出现在本公司的承诺记录中。</p><WebButton asChild className="mt-4" variant="secondary"><Link href={`/company/${encodeURIComponent(id)}`}>返回公司概览</Link></WebButton></div>

  return (
    <section aria-labelledby="promise-form-heading">
      <header className="border-b border-border pb-5">
        <h2 id="promise-form-heading" className="text-xl font-semibold text-foreground">记录承诺与实际结果</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          不上传原件。系统只保存证据类型和不可逆指纹，所有记录人工审核后公开。
        </p>
      </header>
      <form onSubmit={submit} className="mt-6 grid gap-5 sm:grid-cols-2">
        {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
        <label className="text-sm font-medium">
          承诺类型
          <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>
            {["薪酬", "晋升", "工作地点", "岗位职责", "奖金", "其他"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          承诺日期
          <input type="date" value={promiseDate} onChange={(event) => setPromiseDate(event.target.value)} className={inputClass} required />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          当时的承诺
          <Textarea value={promiseText} onChange={(event) => setPromiseText(event.target.value)} minLength={5} maxLength={160} className="mt-1.5 min-h-24" required />
        </label>
        <label className="text-sm font-medium">
          实际结果
          <select value={outcomeStatus} onChange={(event) => setOutcomeStatus(event.target.value)} className={inputClass} required>
            <option value="" disabled>请选择实际结果</option>
            <option value="kept">已兑现</option>
            <option value="partial">部分兑现</option>
            <option value="broken">未兑现</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          证据类型
          <select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} className={inputClass}>
            <option value="offer">Offer</option>
            <option value="email">邮件</option>
            <option value="chat">沟通记录</option>
            <option value="policy">制度文件</option>
            <option value="other">其他</option>
          </select>
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          实际发生
          <Textarea value={outcomeText} onChange={(event) => setOutcomeText(event.target.value)} minLength={5} maxLength={160} className="mt-1.5 min-h-24" required />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          证据摘要
          <input value={evidenceReference} onChange={(event) => setEvidenceReference(event.target.value)} minLength={3} maxLength={300} placeholder="例如：Offer 第 3 条，或邮件日期与主题" className={inputClass} required />
        </label>
        <WebButton type="submit" disabled={submitting} className="sm:col-span-2">
          {submitting ? "提交中..." : "提交人工审核"}
        </WebButton>
      </form>
    </section>
  )
}

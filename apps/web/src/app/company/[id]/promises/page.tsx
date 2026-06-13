"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { SolidButton } from "@/components/ui/solid-button"
import { Textarea } from "@/components/ui/textarea"

export default function PromiseSubmissionPage() {
  const { id } = useParams<{ id: string }>()
  const [category, setCategory] = useState("薪酬")
  const [promiseText, setPromiseText] = useState("")
  const [promiseDate, setPromiseDate] = useState("")
  const [outcomeText, setOutcomeText] = useState("")
  const [outcomeStatus, setOutcomeStatus] = useState("broken")
  const [evidenceType, setEvidenceType] = useState("offer")
  const [evidenceReference, setEvidenceReference] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "提交失败")
      toast.success("记录已提交人工审核")
      setPromiseText("")
      setOutcomeText("")
      setEvidenceReference("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交失败")
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = "mt-1.5 h-11 w-full border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring"

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="border-b border-border pb-5">
        <p className="text-sm font-semibold text-primary">承诺记录</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">记录承诺与实际结果</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          不上传原件。系统只保存证据类型和不可逆指纹，所有记录人工审核后公开。
        </p>
      </header>
      <form onSubmit={submit} className="mt-6 grid gap-5 sm:grid-cols-2">
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
          <Textarea value={promiseText} onChange={(event) => setPromiseText(event.target.value)} maxLength={160} className="mt-1.5 min-h-24" required />
        </label>
        <label className="text-sm font-medium">
          实际结果
          <select value={outcomeStatus} onChange={(event) => setOutcomeStatus(event.target.value)} className={inputClass}>
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
          <Textarea value={outcomeText} onChange={(event) => setOutcomeText(event.target.value)} maxLength={160} className="mt-1.5 min-h-24" required />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          证据摘要
          <input value={evidenceReference} onChange={(event) => setEvidenceReference(event.target.value)} maxLength={300} placeholder="例如：Offer 第 3 条，或邮件日期与主题" className={inputClass} required />
        </label>
        <SolidButton type="submit" disabled={submitting} className="sm:col-span-2">
          {submitting ? "提交中..." : "提交人工审核"}
        </SolidButton>
      </form>
    </main>
  )
}

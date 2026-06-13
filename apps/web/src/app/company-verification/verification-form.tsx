"use client"

import Link from "next/link"
import React, { useMemo, useState } from "react"
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  LockKeyhole,
  MailCheck,
  ShieldCheck,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { companies } from "@/lib/mock-data"

type ProofType = "work_email" | "business_document"

export function VerificationForm({
  initialCompanyId,
  initialCompanyName,
}: {
  initialCompanyId: string
  initialCompanyName: string
}) {
  const { user, loading } = useAuth()
  const initialCompany = useMemo(
    () => companies.find((company) => company.id === initialCompanyId),
    [initialCompanyId]
  )
  const [companyId, setCompanyId] = useState(initialCompany?.id ?? initialCompanyId)
  const [companyName, setCompanyName] = useState(initialCompany?.name ?? initialCompanyName)
  const [applicantName, setApplicantName] = useState("")
  const [workEmail, setWorkEmail] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [proofType, setProofType] = useState<ProofType>("work_email")
  const [note, setNote] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  // L1 verification code step
  const [pendingVerificationId, setPendingVerificationId] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [codeSending, setCodeSending] = useState(false)
  const [codeConfirming, setCodeConfirming] = useState(false)
  const [verified, setVerified] = useState(false)

  function chooseCompany(value: string) {
    const company = companies.find((item) => item.id === value)
    setCompanyId(value)
    setCompanyName(company?.name ?? "")
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    if (!companyId || !companyName || !applicantName || !workEmail || !jobTitle) {
      setError("请完整填写公司与申请人信息")
      return
    }
    if (!agreed) {
      setError("请先确认认证信息真实且已获得公司授权")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/company-verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, companyName, applicantName, workEmail, jobTitle, proofType, note }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? "认证申请提交失败")
        return
      }
      if (result.requiresManualReview) {
        setSubmitted(true)
      } else if (proofType === "work_email") {
        // Step 2: send code then enter code
        setPendingVerificationId(result.verification.id)
        await sendCode(result.verification.id)
      } else {
        setSubmitted(true)
      }
    } catch {
      setError("网络连接失败，请稍后重试")
    } finally {
      setSubmitting(false)
    }
  }

  async function sendCode(verificationId: string) {
    setCodeSending(true)
    setError("")
    try {
      const res = await fetch(`/api/company-verifications/${verificationId}/send-code`, {
        method: "POST",
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error ?? "发送验证码失败")
        return
      }
    } catch {
      setError("网络连接失败，请稍后重试")
    } finally {
      setCodeSending(false)
    }
  }

  async function confirmCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pendingVerificationId || verificationCode.length !== 6) return
    setCodeConfirming(true)
    setError("")
    try {
      const res = await fetch(`/api/company-verifications/${pendingVerificationId}/confirm-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error ?? "验证码不正确")
        return
      }
      setVerified(true)
    } catch {
      setError("网络连接失败，请稍后重试")
    } finally {
      setCodeConfirming(false)
    }
  }

  if (!loading && !user) {
    return (
      <section className="mx-auto w-full max-w-section px-4 py-12 sm:px-6">
        <SolidCard variant="elevated" className="p-7 text-center">
          <ShieldCheck className="mx-auto size-9 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold text-foreground">登录后申请公司认证</h1>
          <p className="mt-2 text-sm text-muted-foreground">认证申请需要绑定负责人账号，以便查询审核状态。</p>
          <SolidButton asChild className="mt-6" variant="primary">
            <Link href="/login">登录 / 注册</Link>
          </SolidButton>
        </SolidCard>
      </section>
    )
  }

  if (verified) {
    return (
      <section className="mx-auto w-full max-w-section px-4 py-12 sm:px-6">
        <div className="border-y border-border py-10 text-center">
          <CheckCircle2 className="mx-auto size-10 text-primary" />
          <p className="mt-4 text-sm font-semibold text-primary">认证成功</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">企业邮箱验证通过</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            你的企业邮箱身份已经确认，身份卡材质即将解锁。如需进一步增强可信度，可继续提交任职证明。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <SolidButton asChild variant="primary">
              <Link href="/me">查看身份</Link>
            </SolidButton>
          </div>
        </div>
      </section>
    )
  }

  if (pendingVerificationId && !verified) {
    return (
      <section className="mx-auto w-full max-w-section px-4 py-12 sm:px-6">
        <SolidCard variant="elevated" className="p-7">
          <div className="mb-6 text-center">
            <MailCheck className="mx-auto size-9 text-primary" />
            <h1 className="mt-4 text-xl font-semibold text-foreground">请查收验证码</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              验证码已发送至{" "}
              <span className="font-medium text-foreground">{workEmail}</span>
              <br />
              为保护隐私，邮件标题和发件方不含平台信息。
            </p>
          </div>
          <form onSubmit={confirmCode} className="space-y-4">
            <div>
              <label htmlFor="verification-code" className="mb-1.5 block text-sm font-medium text-foreground">
                6 位验证码
              </label>
              <Input
                id="verification-code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="text-center text-xl tracking-[0.5em]"
                maxLength={6}
                required
              />
            </div>
            {error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}
            <SolidButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={codeConfirming || verificationCode.length !== 6}
            >
              {codeConfirming ? "验证中..." : "确认验证码"}
            </SolidButton>
            <button
              type="button"
              onClick={() => sendCode(pendingVerificationId)}
              disabled={codeSending}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {codeSending ? "发送中..." : "没收到？重新发送"}
            </button>
          </form>
        </SolidCard>
      </section>
    )
  }

  if (submitted) {
    return (
      <section className="mx-auto w-full max-w-section px-4 py-12 sm:px-6">
        <div className="border-y border-border py-10 text-center">
          <CheckCircle2 className="mx-auto size-10 text-primary" />
          <p className="mt-4 text-sm font-semibold text-primary">申请已提交</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">认证申请审核中</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            审核通常需要 48 小时。通过后身份等级自动提升，凭证原件审完即删。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <SolidButton asChild variant="primary">
              <Link href="/me">查看认证状态</Link>
            </SolidButton>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto grid w-full max-w-page gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <div className="border-b border-border pb-6">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <ShieldCheck className="size-4" />
            公司认证
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">确认企业身份，回应公开信息</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            认证后公司可维护基础资料、提交官方回应和申请纠错。员工评价保持匿名，公司无法查看评价者身份。
          </p>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-6" noValidate>
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-foreground">公司信息</legend>
            <div>
              <label htmlFor="verification-company" className="mb-1.5 block text-sm font-medium text-foreground">
                选择公司
              </label>
              <select
                id="verification-company"
                value={companyId}
                onChange={(event) => chooseCompany(event.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                required
              >
                <option value="">请选择公司</option>
                {companyId && !companies.some((company) => company.id === companyId) ? (
                  <option value={companyId}>{companyName}</option>
                ) : null}
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} · {company.city}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="col-span-full text-base font-semibold text-foreground">申请人信息</legend>
            <div>
              <label htmlFor="verification-name" className="mb-1.5 block text-sm font-medium text-foreground">
                姓名
              </label>
              <Input
                id="verification-name"
                value={applicantName}
                onChange={(event) => setApplicantName(event.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label htmlFor="verification-title" className="mb-1.5 block text-sm font-medium text-foreground">
                职务
              </label>
              <Input
                id="verification-title"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="例如：品牌负责人"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="verification-email" className="mb-1.5 block text-sm font-medium text-foreground">
                联系邮箱
              </label>
              <Input
                id="verification-email"
                type="email"
                value={workEmail}
                onChange={(event) => setWorkEmail(event.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                required
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                企业邮箱验证需使用公司域名；选择任职证明时可填写常用联系邮箱。
              </p>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-base font-semibold text-foreground">核验方式</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {([
                ["work_email", MailCheck, "企业邮箱", "通过公司域名邮箱完成验证"],
                ["business_document", FileCheck2, "任职证明", "审核人员联系你补充材料"],
              ] as const).map(([value, Icon, label, description]) => (
                <label
                  key={value}
                  className={`flex min-h-20 cursor-pointer items-start gap-3 border p-4 ${
                    proofType === value ? "border-primary bg-primary-tint" : "border-border bg-card"
                  }`}
                >
                  <input
                    type="radio"
                    name="proofType"
                    value={value}
                    checked={proofType === value}
                    onChange={() => setProofType(value)}
                    className="mt-1"
                  />
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="verification-note" className="mb-1.5 block text-sm font-medium text-foreground">
              补充说明 <span className="text-muted-foreground">（选填）</span>
            </label>
            <Textarea
              id="verification-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="说明你负责的业务范围，或方便核验的信息。"
              className="min-h-24"
              maxLength={500}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-1 size-4"
            />
            <span>我确认以上信息真实，并已获得代表该公司申请认证的授权。</span>
          </label>

          {error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}

          <SolidButton type="submit" variant="primary" size="lg" disabled={submitting || loading}>
            {submitting ? "提交中..." : "提交认证申请"}
          </SolidButton>
        </form>
      </div>

      <aside className="border-l-0 border-border lg:border-l lg:pl-7">
        <h2 className="text-sm font-semibold text-foreground">认证边界</h2>
        <div className="mt-4 space-y-5 text-sm leading-6 text-muted-foreground">
          <p className="flex gap-3">
            <Building2 className="mt-1 size-4 shrink-0 text-primary" />
            只确认企业主体与申请人身份，不代表平台为公司评价背书。
          </p>
          <p className="flex gap-3">
            <LockKeyhole className="mt-1 size-4 shrink-0 text-primary" />
            公司无法获得匿名作者的邮箱、手机号或其他身份信息。
          </p>
          <p className="flex gap-3">
            <FileCheck2 className="mt-1 size-4 shrink-0 text-primary" />
            官方回应和资料修改会明确标记来源，并保留审核记录。
          </p>
        </div>
      </aside>
    </section>
  )
}

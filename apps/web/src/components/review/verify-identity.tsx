"use client"

import { useState } from "react"
import { Building2, CheckCircle2, Mail, ShieldCheck } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"

type Step = "idle" | "email" | "code" | "verified"

export function VerifyIdentity({ companyName }: { companyName: string }) {
  const [step, setStep] = useState<Step>("idle")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const companyDomain = companyName
    ? `${companyName.replace(/[（(].*|[^\u4e00-\u9fa5a-zA-Z]/g, "").toLowerCase()}.com`
    : "company.com"

  function sendCode() {
    if (!email.trim()) {
      setError("请输入公司邮箱")
      return
    }
    setError("")
    setSending(true)
    // Mock: 1s delay
    setTimeout(() => {
      setSending(false)
      setStep("code")
    }, 1000)
  }

  function verifyCode() {
    if (!code.trim()) {
      setError("请输入验证码")
      return
    }
    setError("")
    setVerifying(true)
    // Mock: 1s delay, always succeed with "000000"
    setTimeout(() => {
      setVerifying(false)
      if (code === "000000") {
        setStep("verified")
      } else {
        setError("验证码错误，请重试")
      }
    }, 1000)
  }

  // ── Success ────────────────────────────────────────────────────────────
  if (step === "verified") {
    return (
      <SolidCard variant="emerald" className="p-6 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
          <CheckCircle2 className="size-7 text-secondary-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">身份已验证</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          你的评价已标记为「✅ 已验证员工」
          <br />
          验证信息不会公开，仅用于提升评价可信度
        </p>
      </SolidCard>
    )
  }

  // ── Collapsed: "提升可信度" card ──────────────────────────────────────
  if (step === "idle") {
    return (
      <SolidCard variant="subtle" className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-risk-surface">
            <ShieldCheck className="size-5 text-risk" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">提升评价可信度</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              用公司邮箱验证身份，评价将带上「已验证员工」标记。
              验证记录仅存服务端，绝不公开。不验证也不影响评价发布。
            </p>
            <SolidButton
              variant="secondary"
              size="sm"
              onClick={() => setStep("email")}
              className="mt-3"
            >
              <Building2 className="size-3.5" />
              验证身份
            </SolidButton>
          </div>
        </div>
      </SolidCard>
    )
  }

  // ── Email input ───────────────────────────────────────────────────────
  if (step === "email") {
    return (
      <SolidCard variant="subtle" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="size-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">验证公司邮箱</h3>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          我们会向你的公司邮箱发送验证码。建议格式：name@{companyDomain}
        </p>

        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError("") }}
            placeholder={`name@${companyDomain}`}
            className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          <SolidButton
            variant="primary"
            size="sm"
            onClick={sendCode}
            disabled={sending || !email.trim()}
          >
            {sending ? "发送中..." : "发送验证码"}
          </SolidButton>
        </div>

        {error && <p className="mt-2 text-xs text-destructive-bright">{error}</p>}

        <button
          onClick={() => { setStep("idle"); setError("") }}
          className="mt-3 text-xs text-muted-foreground hover:text-muted-foreground"
        >
          取消
        </button>
      </SolidCard>
    )
  }

  // ── Code input ────────────────────────────────────────────────────────
  return (
    <SolidCard variant="subtle" className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="size-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">输入验证码</h3>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        验证码已发送至 {email || "你的邮箱"}（演示码：000000）
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError("") }}
          placeholder="000000"
          maxLength={6}
          className="w-32 rounded-xl border border-border bg-card px-3 py-2 text-center text-lg tracking-[0.3em] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <SolidButton
          variant="primary"
          size="sm"
          onClick={verifyCode}
          disabled={verifying || code.length < 6}
        >
          {verifying ? "验证中..." : "确认验证"}
        </SolidButton>
      </div>

      {error && <p className="mt-2 text-xs text-destructive-bright">{error}</p>}

      <button
        onClick={() => { setStep("email"); setError("") }}
        className="mt-3 text-xs text-muted-foreground hover:text-muted-foreground"
      >
        ← 重新输入邮箱
      </button>
    </SolidCard>
  )
}

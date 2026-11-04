"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Mail } from "lucide-react"
import { WebButton } from "@/components/ui/web-button"
import { WebSurface } from "@/components/ui/web-surface"
import { useAuth } from "@/lib/auth-context"
import { getSafeNextPath, withNext } from "@/lib/navigation"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const { register, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = getSafeNextPath(searchParams.get("next"), "/me")
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [inviteCode, setInviteCode] = useState(() => searchParams.get("invite")?.toUpperCase() ?? "")
  const [config, setConfig] = useState<{ inviteRequired: boolean; emailDeliveryAvailable?: boolean } | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => { if (user) router.replace(nextPath) }, [user, router, nextPath])
  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/config/register", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error()
        const result = await response.json()
        if (typeof result.inviteRequired !== "boolean") throw new Error()
        setConfig(result)
      })
      .catch(() => { if (!controller.signal.aborted) setError("注册信息加载失败，请刷新重试") })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  function validEmailAndInvite() {
    if (!EMAIL_RE.test(email.trim()) || email.trim().length > 254) { setError("请输入有效邮箱"); return false }
    if (config?.inviteRequired && !inviteCode.trim()) { setError("请输入邀请码"); return false }
    return true
  }

  async function sendCode() {
    setError("")
    setNotice("")
    if (!validEmailAndInvite()) return
    setSending(true)
    try {
      const response = await fetch("/api/auth/register-code", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), inviteCode: inviteCode.trim() || undefined }),
      })
      const result = await response.json()
      if (!response.ok) {
        if (response.status === 429) setCooldown(Math.min(3600, Math.max(1, Number(response.headers.get("Retry-After")) || 60)))
        throw new Error(result.error ?? "验证码发送失败，请稍后重试")
      }
      setCooldown(60)
      setNotice("验证码已发送，请查看邮箱")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "网络异常，请稍后重试")
    } finally { setSending(false) }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    if (!validEmailAndInvite()) return
    if (!/^\d{6}$/.test(verificationCode)) { setError("请输入 6 位邮箱验证码"); return }
    if (password.length < 8 || password.length > 128) { setError("密码需要 8–128 位字符"); return }
    if (confirmation !== password) { setError("两次密码输入不一致"); return }
    setSubmitting(true)
    const result = await register({ email: email.trim().toLowerCase(), verificationCode, password, inviteCode: inviteCode.trim() || undefined })
    setSubmitting(false)
    if (result.error) setError(result.error)
    else router.replace(nextPath)
  }

  if (user) return null
  const inputClass = "mt-1.5 min-h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
  const unavailable = config?.emailDeliveryAvailable === false

  return (
    <section className="mx-auto flex min-h-[80vh] w-full max-w-form items-center px-4 py-10">
      <WebSurface variant="elevated" className="w-full p-6 sm:p-8">
        <Mail className="mb-3 size-6 text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">注册在场</h1>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <label className="block text-sm font-medium">
            邮箱
            <input type="email" autoComplete="email" maxLength={254} value={email} disabled={sending || submitting}
              onChange={(event) => { setEmail(event.target.value); setVerificationCode(""); setNotice("") }}
              placeholder="name@example.com" className={inputClass} />
          </label>
          {config?.inviteRequired ? <label className="block text-sm font-medium">
            邀请码
            <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              maxLength={8} autoCapitalize="characters" spellCheck={false} className={inputClass} />
          </label> : null}
          <label className="block text-sm font-medium">
            邮箱验证码
            <span className="mt-1.5 flex min-w-0 gap-2">
              <input aria-label="邮箱验证码" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6 位数字" className={inputClass + " mt-0 min-w-0 flex-1 tabular-nums"} />
              <WebButton type="button" variant="secondary" onClick={() => void sendCode()}
                disabled={sending || submitting || cooldown > 0 || !config || unavailable}>
                {sending ? "发送中…" : cooldown ? cooldown + " 秒后重发" : "获取验证码"}
              </WebButton>
            </span>
          </label>
          <label className="block text-sm font-medium">
            密码
            <input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password}
              onChange={(event) => setPassword(event.target.value)} placeholder="8–128 位字符" className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            确认密码
            <input type="password" autoComplete="new-password" maxLength={128} value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)} className={inputClass} />
          </label>
          {notice ? <p role="status" className="text-sm text-primary-deep">{notice}</p> : null}
          {unavailable ? <p role="status" className="text-sm text-muted-foreground">邮箱验证暂不可用，请稍后再试。</p> : null}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <p className="text-xs leading-6 text-muted-foreground">
            注册即表示同意<Link href="/legal/terms" className="underline">用户协议</Link>和<Link href="/legal/privacy" className="underline">隐私政策</Link>。你的身份信息不会向公司方公开。
          </p>
          <WebButton type="submit" variant="primary" disabled={submitting || sending || !config || unavailable} className="w-full">
            {submitting ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" />注册中…</> : "注册"}
          </WebButton>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">已有账号？<Link href={withNext("/login", nextPath)} className="ml-1 font-medium text-primary-deep underline">登录</Link></p>
      </WebSurface>
    </section>
  )
}

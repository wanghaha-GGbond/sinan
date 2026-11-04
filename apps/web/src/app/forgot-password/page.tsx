"use client"

import { useState } from "react"
import Link from "next/link"
import { WebButton } from "@/components/ui/web-button"
import { WebSurface } from "@/components/ui/web-surface"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }), signal: AbortSignal.timeout(15_000),
      })
      const data = await response.json()
      if (!response.ok) { setError(data.error ?? "暂时无法处理，请稍后再试"); return }
      setMessage(data.message)
    } catch { setError("连接失败，请稍后再试") }
    finally { setBusy(false) }
  }

  return <div className="flex min-h-[80vh] items-center justify-center px-4">
    <WebSurface variant="elevated" className="w-full max-w-form space-y-6 p-8">
      <h1 className="text-xl font-semibold">找回密码</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="recovery-email" className="mb-2 block text-sm font-medium">注册邮箱</label>
          <input id="recovery-email" type="email" autoComplete="email" required maxLength={254}
            value={email} onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-primary" />
        </div>
        {error && <p role="alert" className="text-sm text-destructive-bright">{error}</p>}
        {message && <p role="status" className="text-sm">{message}</p>}
        <WebButton type="submit" disabled={busy} className="w-full">
          {busy ? "提交中…" : "发送重置链接"}
        </WebButton>
      </form>
      <div className="flex justify-between text-sm">
        <Link href="/login" className="text-primary hover:underline">返回登录</Link>
        <Link href="/support" className="text-muted-foreground hover:underline">无法使用邮箱？</Link>
      </div>
    </WebSurface>
  </div>
}

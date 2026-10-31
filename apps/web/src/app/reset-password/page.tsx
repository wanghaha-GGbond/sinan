"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { WebButton } from "@/components/ui/web-button"
import { WebSurface } from "@/components/ui/web-surface"
import { useAuth } from "@/lib/auth-context"

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null)
  const loaded = useRef(false)
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const { refresh } = useAuth()

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const value = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? ""
    window.history.replaceState(null, "", window.location.pathname)
    // The token exists only in this form's memory, never in storage or a GET URL.
    setToken(value.length === 64 && /^[a-f0-9]{64}$/.test(value) ? value : "")
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy || !token) return
    setError("")
    if (password !== confirmation) { setError("两次密码不一致"); return }
    setBusy(true)
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }), signal: AbortSignal.timeout(20_000),
      })
      const data = await response.json()
      if (!response.ok) { setError(data.error ?? "暂时无法更新密码"); return }
      setPassword("")
      setConfirmation("")
      setToken("")
      setDone(true)
      await refresh()
    } catch { setError("连接中断。若已更新，请用新密码登录；否则可重试。") }
    finally { setBusy(false) }
  }

  return <div className="flex min-h-[80vh] items-center justify-center px-4">
    <WebSurface variant="elevated" className="w-full max-w-form space-y-6 p-8">
      <h1 className="text-xl font-semibold">{done ? "密码已更新" : "设置新密码"}</h1>
      {done ? <p role="status" className="text-sm">请用新密码重新登录。</p>
        : token === null ? <p role="status">正在检查链接…</p>
        : !token ? <p role="alert" className="text-sm">链接无效，请重新申请。</p>
        : <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-medium">新密码</label>
            <input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128}
              placeholder="8–128 位字符" value={password} onChange={(event) => { setPassword(event.target.value); setError("") }}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-primary" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">确认密码</label>
            <input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={128}
              value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError("") }}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-primary" />
          </div>
          {error && <p role="alert" className="text-sm text-destructive-bright">{error}</p>}
          <WebButton type="submit" disabled={busy} className="w-full">{busy ? "保存中…" : "保存新密码"}</WebButton>
        </form>}
      <div className="flex justify-between text-sm">
        <Link href="/login" className="text-primary hover:underline">返回登录</Link>
        {!done && <Link href="/forgot-password" className="text-muted-foreground hover:underline">重新获取链接</Link>}
      </div>
    </WebSurface>
  </div>
}

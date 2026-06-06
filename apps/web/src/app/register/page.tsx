"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Compass, Mail, Phone, Shield } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { useAuth } from "@/lib/auth-context"

export default function RegisterPage() {
  const { register, user } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<"email" | "phone">("email")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) router.replace("/")
  }, [user, router])

  if (user) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (mode === "email" && !email.trim()) {
      setError("请输入邮箱")
      return
    }
    if (mode === "phone" && !phone.trim()) {
      setError("请输入手机号")
      return
    }
    if (password.length < 8) {
      setError("密码至少 8 位字符")
      return
    }
    if (password !== confirmPassword) {
      setError("两次密码输入不一致")
      return
    }

    setSubmitting(true)
    const result = await register({
      email: mode === "email" ? email.trim() : undefined,
      phone: mode === "phone" ? phone.trim() : undefined,
      password,
    })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      router.push("/")
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <SolidCard variant="elevated" className="w-full max-w-[400px] p-8">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary shadow-[0_4px_0_rgba(14,143,95,0.12)]">
            <Compass className="size-7 text-secondary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">注册司南</h1>
          <p className="text-sm text-muted-foreground">成为指路人，分享真实体验</p>
        </div>

        {/* Toggle */}
        <div className="mb-6 flex rounded-2xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("email")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              mode === "email"
                ? "bg-white text-foreground shadow-[0_2px_0_rgba(17,24,39,0.06)]"
                : "text-muted-foreground"
            }`}
          >
            <Mail className="size-4" />
            邮箱
          </button>
          <button
            type="button"
            onClick={() => setMode("phone")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              mode === "phone"
                ? "bg-white text-foreground shadow-[0_2px_0_rgba(17,24,39,0.06)]"
                : "text-muted-foreground"
            }`}
          >
            <Phone className="size-4" />
            手机
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "email" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-secondary"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                手机号
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="13800138000"
                maxLength={11}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-secondary"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 8 位字符"
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-secondary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              确认密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-secondary"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-[#FEF2F2] px-4 py-2.5 text-sm text-[#DC2626]">
              {error}
            </p>
          )}

          {/* Privacy note */}
          <div className="flex items-start gap-2 rounded-2xl bg-muted p-3">
            <Shield className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              注册即表示同意司南的匿名保护规则。你的身份信息不会向公司方公开。
            </p>
          </div>

          <SolidButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
            className="w-full"
          >
            {submitting ? "注册中..." : "注册"}
          </SolidButton>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          已有账号？{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            登录
          </Link>
        </p>
      </SolidCard>
    </div>
  )
}

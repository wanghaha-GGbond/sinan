"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Compass, Mail, Phone } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const { login, user } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<"email" | "phone">("email")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Redirect if already logged in
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
    if (!password) {
      setError("请输入密码")
      return
    }

    setSubmitting(true)
    const result = await login({
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
          <h1 className="text-xl font-semibold text-foreground">登录司南</h1>
          <p className="text-sm text-muted-foreground">入职前，先看清方向</p>
        </div>

        {/* Toggle email / phone */}
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

          {error && (
            <p className="rounded-xl bg-[#FEF2F2] px-4 py-2.5 text-sm text-[#DC2626]">
              {error}
            </p>
          )}

          <SolidButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
            className="w-full"
          >
            {submitting ? "登录中..." : "登录"}
          </SolidButton>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          还没有账号？{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            注册
          </Link>
        </p>
      </SolidCard>
    </div>
  )
}

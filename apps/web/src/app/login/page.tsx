"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Compass, Mail, Phone, Loader2 } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { useAuth } from "@/lib/auth-context"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^1[3-9]\d{9}$/

export default function LoginPage() {
  const { login, user } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<"email" | "phone">("email")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [touched, setTouched] = useState<{ email?: boolean; phone?: boolean; password?: boolean }>({})
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const emailRef = useRef<HTMLInputElement | null>(null)
  const phoneRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    if (user) router.replace("/")
  }, [user, router])

  if (user) return null

  // Field-level validation (only after the field has been blurred once)
  const emailError =
    touched.email && email && !EMAIL_RE.test(email.trim())
      ? "邮箱格式看起来不太对,检查一下 @ 和域名"
      : null
  const phoneError =
    touched.phone && phone && !PHONE_RE.test(phone.trim())
      ? "手机号应该是 11 位数字,以 1 开头"
      : null
  const passwordError =
    touched.password && password && password.length < 8
      ? "密码至少 8 位字符"
      : null
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // Mark everything touched on submit so the user sees what's wrong
    setTouched({ email: true, phone: true, password: true })

    if (mode === "email" && !email.trim()) {
      emailRef.current?.focus()
      return
    }
    if (mode === "phone" && !phone.trim()) {
      phoneRef.current?.focus()
      return
    }
    if (!password) {
      passwordRef.current?.focus()
      return
    }
    if (emailError || phoneError || passwordError) {
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

  const inputBase =
    "w-full rounded-2xl border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  const inputNormal = "border-border focus-visible:border-primary"
  const inputError = "border-destructive-bright focus-visible:border-destructive-bright focus-visible:ring-destructive-bright/30"

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
            onClick={() => {
              setMode("email")
              setTouched((t) => ({ ...t, phone: false }))
            }}
            aria-pressed={mode === "email"}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              mode === "email"
                ? "bg-white text-foreground shadow-[0_2px_0_rgba(17,24,39,0.06)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="size-4" />
            邮箱
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("phone")
              setTouched((t) => ({ ...t, email: false }))
            }}
            aria-pressed={mode === "phone"}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              mode === "phone"
                ? "bg-white text-foreground shadow-[0_2px_0_rgba(17,24,39,0.06)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Phone className="size-4" />
            手机
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {mode === "email" ? (
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-foreground">
                邮箱
              </label>
              <input
                ref={emailRef}
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError("")
                }}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="name@company.com"
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? "login-email-error" : undefined}
                className={`${inputBase} ${emailError ? inputError : inputNormal}`}
              />
              {emailError ? (
                <p id="login-email-error" className="mt-1.5 text-xs text-destructive-bright">
                  {emailError}
                </p>
              ) : null}
            </div>
          ) : (
            <div>
              <label htmlFor="login-phone" className="mb-1.5 block text-sm font-medium text-foreground">
                手机号
              </label>
              <input
                ref={phoneRef}
                id="login-phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  if (error) setError("")
                }}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                placeholder="13800138000"
                maxLength={11}
                inputMode="numeric"
                aria-invalid={phoneError ? true : undefined}
                aria-describedby={phoneError ? "login-phone-error" : undefined}
                className={`${inputBase} ${phoneError ? inputError : inputNormal}`}
              />
              {phoneError ? (
                <p id="login-phone-error" className="mt-1.5 text-xs text-destructive-bright">
                  {phoneError}
                </p>
              ) : null}
            </div>
          )}

          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-foreground">
              密码
            </label>
            <input
              ref={passwordRef}
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError("")
              }}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder="至少 8 位字符"
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? "login-password-error" : undefined}
              className={`${inputBase} ${passwordError ? inputError : inputNormal}`}
            />
            {passwordError ? (
              <p id="login-password-error" className="mt-1.5 text-xs text-destructive-bright">
                {passwordError}
              </p>
            ) : null}
          </div>

          {error ? (
            <p id="login-error" role="alert" className="rounded-xl bg-destructive-bright/10 px-4 py-2.5 text-sm text-destructive-bright">
              {error}
            </p>
          ) : null}

          <SolidButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                登录中…
              </>
            ) : (
              "登录"
            )}
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

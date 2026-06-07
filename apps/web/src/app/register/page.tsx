"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Compass, Mail, Phone, Shield, Loader2 } from "lucide-react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { useAuth } from "@/lib/auth-context"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^1[3-9]\d{9}$/

export default function RegisterPage() {
  const { register, user } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<"email" | "phone">("email")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [touched, setTouched] = useState<{ email?: boolean; phone?: boolean; password?: boolean; confirm?: boolean }>({})
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const emailRef = useRef<HTMLInputElement | null>(null)
  const phoneRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)
  const confirmRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (user) router.replace("/")
  }, [user, router])

  if (user) return null

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
  const confirmError =
    touched.confirm && confirmPassword && confirmPassword !== password
      ? "两次密码输入不一致"
      : null
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    setTouched({ email: true, phone: true, password: true, confirm: true })

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
    if (!confirmPassword) {
      confirmRef.current?.focus()
      return
    }
    if (emailError || phoneError || passwordError || confirmError) {
      // Focus the first invalid field
      if (emailError) emailRef.current?.focus()
      else if (phoneError) phoneRef.current?.focus()
      else if (passwordError) passwordRef.current?.focus()
      else if (confirmError) confirmRef.current?.focus()
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

  const inputBase =
    "w-full rounded-2xl border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  const inputNormal = "border-border focus-visible:border-primary"
  const inputError = "border-destructive-bright focus-visible:border-destructive-bright focus-visible:ring-destructive-bright/30"

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <SolidCard variant="elevated" className="w-full max-w-form p-8">
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
              <label htmlFor="register-email" className="mb-1.5 block text-sm font-medium text-foreground">
                邮箱
              </label>
              <input
                ref={emailRef}
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError("")
                }}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="name@company.com"
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? "register-email-error" : undefined}
                className={`${inputBase} ${emailError ? inputError : inputNormal}`}
              />
              {emailError ? (
                <p id="register-email-error" className="mt-1.5 text-xs text-destructive-bright">
                  {emailError}
                </p>
              ) : null}
            </div>
          ) : (
            <div>
              <label htmlFor="register-phone" className="mb-1.5 block text-sm font-medium text-foreground">
                手机号
              </label>
              <input
                ref={phoneRef}
                id="register-phone"
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
                aria-describedby={phoneError ? "register-phone-error" : undefined}
                className={`${inputBase} ${phoneError ? inputError : inputNormal}`}
              />
              {phoneError ? (
                <p id="register-phone-error" className="mt-1.5 text-xs text-destructive-bright">
                  {phoneError}
                </p>
              ) : null}
            </div>
          )}

          <div>
            <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium text-foreground">
              密码
            </label>
            <input
              ref={passwordRef}
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError("")
              }}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder="至少 8 位字符"
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? "register-password-error" : undefined}
              className={`${inputBase} ${passwordError ? inputError : inputNormal}`}
            />
            {passwordError ? (
              <p id="register-password-error" className="mt-1.5 text-xs text-destructive-bright">
                {passwordError}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="register-confirm" className="mb-1.5 block text-sm font-medium text-foreground">
              确认密码
            </label>
            <input
              ref={confirmRef}
              id="register-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (error) setError("")
              }}
              onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
              placeholder="再次输入密码"
              aria-invalid={confirmError ? true : undefined}
              aria-describedby={confirmError ? "register-confirm-error" : undefined}
              className={`${inputBase} ${confirmError ? inputError : inputNormal}`}
            />
            {confirmError ? (
              <p id="register-confirm-error" className="mt-1.5 text-xs text-destructive-bright">
                {confirmError}
              </p>
            ) : null}
          </div>

          {error ? (
            <p id="register-error" role="alert" className="rounded-xl bg-destructive-bright/10 px-4 py-2.5 text-sm text-destructive-bright">
              {error}
            </p>
          ) : null}

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
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                注册中…
              </>
            ) : (
              "注册"
            )}
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

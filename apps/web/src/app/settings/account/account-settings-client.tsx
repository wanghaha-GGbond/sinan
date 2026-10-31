"use client"

import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { WebSurface } from "@/components/ui/web-surface"
import { useAuth } from "@/lib/auth-context"
import { withNext } from "@/lib/navigation"

import { DeleteAccountForm } from "./delete-account-form"

export function AccountSettingsClient() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace(withNext("/login", "/settings/account"))
  }, [loading, router, user])

  if (loading || !user) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-section items-center justify-center px-4 py-10">
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
          {loading ? "正在确认登录状态…" : "正在前往登录…"}
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">账号与数据</h1>
      <p className="mt-3 text-muted-foreground">
        你可以随时注销账号。注销后将立即退出登录，邮箱、手机号、密码、头像、工作邮箱、匿名画像和个人资料会被清除且无法恢复。
      </p>
      <WebSurface className="mt-8 space-y-5 p-6">
        <div>
          <h2 className="text-xl font-semibold">注销账号</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            私聊和个人功能内容会删除。为维护社区审核和争议处理，已审核公开内容可能保留，但会解除账号与匿名画像关联。依法需要留存的最小安全与审计记录会在目的完成后清理。
          </p>
        </div>
        <DeleteAccountForm />
      </WebSurface>
    </section>
  )
}

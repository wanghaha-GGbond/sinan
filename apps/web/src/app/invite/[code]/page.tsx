"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, Users, Star } from "lucide-react"
import { IdentityCard, type IdentityCardData } from "@/components/identity/identity-card"
import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"

type InviteData = {
  code: string
  status: string
  inviter: {
    id: string
    displayName: string | null
    trustLevel: number
    reputationScore: number
    jobBand: string | null
    yearsOfExperience: number | null
    companyName: string | null
  } | null
}

const FEATURES = [
  { icon: ShieldCheck, title: "真实身份认证", desc: "企业邮箱 + 在职证明，匿名发布，公司无法追溯。" },
  { icon: Star, title: "部门级薪酬与评价", desc: "五维评分 + 情绪指数，帮你看清真实职场环境。" },
  { icon: Users, title: "邀请制精英社区", desc: "每位成员都经过认证，信噪比远高于匿名平台。" },
]

export default function InviteLandingPage() {
  const { code } = useParams<{ code: string }>()
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code) return
    fetch(`/api/invites/${code}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: InviteData | null) => {
        setInvite(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [code])

  const isExpired = invite?.status === "used" || invite?.status === "revoked"
  const registerHref = `/register?invite=${code ?? ""}`

  const cardData: IdentityCardData | null = invite?.inviter
    ? {
        displayName: invite.inviter.displayName ?? "匿名用户",
        trustLevel: invite.inviter.trustLevel,
        companyName: invite.inviter.companyName ?? undefined,
        jobBand: invite.inviter.jobBand ?? undefined,
        yearsOfExperience: invite.inviter.yearsOfExperience ?? undefined,
        reputationScore: invite.inviter.reputationScore,
      }
    : null

  if (loading) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-4">
        <div className="h-48 w-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-10 px-4 py-16">
      {/* Inviter card */}
      {cardData && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{invite?.inviter?.displayName ?? "一位认证成员"}</span>
            {" 邀请你加入司南"}
          </p>
          <IdentityCard data={cardData} />
          <p className="text-xs text-muted-foreground">点击卡片查看声誉背面</p>
        </div>
      )}

      {!cardData && !loading && (
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">受邀加入司南</p>
          <p className="mt-2 text-sm text-muted-foreground">高端职场真实评价社区</p>
        </div>
      )}

      {/* CTA */}
      {isExpired ? (
        <SolidCard variant="default" className="w-full p-6 text-center">
          <p className="text-sm font-semibold text-foreground">此邀请码已失效</p>
          <p className="mt-1 text-xs text-muted-foreground">请联系邀请人重新获取一个有效邀请码。</p>
        </SolidCard>
      ) : (
        <div className="flex w-full flex-col gap-3">
          <SolidButton asChild variant="primary" size="lg" className="w-full">
            <Link href={registerHref}>使用邀请码注册</Link>
          </SolidButton>
          <p className="text-center text-xs text-muted-foreground">
            已有账号？{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              登录
            </Link>
          </p>
        </div>
      )}

      {/* Value prop */}
      <div className="w-full space-y-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <SolidCard key={title} variant="default" className="flex items-start gap-4 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Icon className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
            </div>
          </SolidCard>
        ))}
      </div>

      {/* M2 T5.2: spread the loop. Viewers can forward this invite link
          without first registering themselves; the share card carries
          the invite watermark. */}
      {!isExpired && code ? (
        <SolidCard variant="subtle" className="w-full p-4">
          <p className="text-sm font-semibold text-foreground">把这个邀请转发给你也想拉来的人</p>
          <p className="mt-1 text-xs text-muted-foreground">
            分享卡上会自动带上 {invite?.inviter?.displayName ?? "邀请人"} 的邀请码,对方扫码就进你的引荐链。
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="rounded-full bg-white px-3 py-1.5 text-xs text-foreground">
              /invite/{code}
            </code>
            <span className="text-[11px] text-muted-foreground">
              (复制链接发出去,对方点进来就是这张邀请卡)
            </span>
          </div>
        </SolidCard>
      ) : null}
    </section>
  )
}

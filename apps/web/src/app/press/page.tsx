/**
 * /press — 传播素材中心(04 §1.3 spec,05 §3 spec)。
 *
 * 这是给运营 / BD / 早期用户 / 媒体记者自取物料的一站式页面。
 * 不需要登录,但要克制——克制本身就是品牌的一部分(per 01 §二
 * 视觉克制原则)。
 *
 * 三大块:
 *   1. 情绪指数分享卡生成器:填公司名+分数+邀请人,出 1200×630 PNG
 *   2. 邀请链接生成器:邀请码 → 一键复制,顺带出预览分享卡
 *   3. 媒体包:产品定位、可发引用的口径、可视资源,直接复制
 *
 * 设计原则:
 *   - 不让媒体 / BD 走任何注册流——这是一道"来的人就让他拿"的入口
 *   - 任何文案都标注 [官方/可改] 标签,告诉读者这是"我们建议的
 *     措辞"而不是"你必须照搬"
 *   - 数据口径要清晰,免得引用时传错
 */
import { Suspense } from "react"

import Link from "next/link"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"
import { PressShareCardGenerator } from "@/components/press/press-share-card-generator"
import { PressInviteLinkGenerator } from "@/components/press/press-invite-link-generator"
import { PressMediaKit } from "@/components/press/press-media-kit"

export const dynamic = "force-static"

export default function PressPage() {
  return (
    <section className="mx-auto flex w-full max-w-page flex-col gap-8 px-4 py-8 sm:px-6">
      {/* Hero — 媒体 / BD 自取物料的总入口,克制到底 */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TagPill tone="match">传播素材中心</TagPill>
          <TagPill tone="neutral">给媒体 / 早期用户 / BD</TagPill>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          如果你正在写一篇关于司南的稿子
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          这一页汇总了 2026 年 M2 阶段司南所有可外发的物料——产品定位、官方
          措辞、可视资源。直接拿走,不需要注册;不放心的话文末有我们编辑的
          联系方式。
        </p>
        <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
          司南是打工人评价公司的社区。我们是 ToC 产品,公司不会出现在
          我们的用户列表里,也不会拿到任何评价数据——这部分的官方
          措辞见「媒体包」。
        </p>
      </header>

      {/* Generator 1: 情绪指数分享卡 */}
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <PressShareCardGenerator />
      </Suspense>

      {/* Generator 2: 邀请链接生成器 */}
      <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-muted" />}>
        <PressInviteLinkGenerator />
      </Suspense>

      {/* 媒体包:可发引用的口径 + 品牌资料 */}
      <PressMediaKit />

      {/* Contact */}
      <SolidCard variant="subtle" className="p-5">
        <h2 className="text-base font-semibold text-foreground">编辑联系</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          司南的对外口径 / 数据引用 / 拍摄 / 联合活动,请通过
          <a
            href="mailto:press@sinan.app"
            className="ml-1 font-semibold text-primary-deep hover:underline"
          >
            press@sinan.app
          </a>
          找我们。我们对媒体朋友是 24 小时内回。
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          这一页是 M2 临时形态——M3 之后会换成正式 brand kit,加 logo
          包、字体包、产品截图原件、和一份「请勿引用」清单(我们主动
          列出来,比记者帮你查更高效)。
        </p>
        <div className="mt-4">
          <SolidButton asChild variant="secondary" size="sm">
            <Link href="/">回到推荐</Link>
          </SolidButton>
        </div>
      </SolidCard>
    </section>
  )
}

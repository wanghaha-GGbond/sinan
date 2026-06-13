"use client"

import { useState } from "react"

import { SolidButton } from "@/components/ui/solid-button"
import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"

/**
 * 邀请链接生成器(04 §1.3)。
 *
 * K 因子的成败 50% 在这一行:
 *   落地页 → 注册转化
 * 因此生成器要让你 1)看见完整 URL 2)看见落地页 OG 卡片预览。
 *
 * 邀请码格式:8 位,去易混字符 (per 04 §1.1)。我们这里只做"占位
 * 邀请码"——真实的核销在 /api/auth/register 后端,这里只是 URL
 * 模板生成。
 */
const SAMPLE_CODES = ["ABCD2345", "WXYZ6789", "JANE9012", "MIKE3456"]

export function PressInviteLinkGenerator() {
  const [code, setCode] = useState(SAMPLE_CODES[0])
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle")

  const origin = typeof window !== "undefined" ? window.location.origin : "https://sinan.app"
  const inviteUrl = `${origin}/invite/${code}`
  const registerUrl = `${origin}/register?invite=${code}`

  async function copy(text: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied("ok")
      window.setTimeout(() => setCopied("idle"), 1800)
    } catch {
      setCopied("fail")
      window.setTimeout(() => setCopied("idle"), 1800)
    }
  }

  return (
    <SolidCard variant="elevated" className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">邀请链接生成器</h2>
        <TagPill tone="match">K 因子入口</TagPill>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        把你的邀请链接发给朋友——他们会先看到你的身份卡(就是背书),再
        决定要不要注册。
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-1 text-xs font-medium text-foreground">
          邀请码 (8 位,去易混字符)
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
            className="rounded-[14px] border border-border/60 bg-white px-3 py-2 font-mono text-sm tracking-widest shadow-[0_3px_0_rgba(17,24,39,0.04)]"
            data-testid="press-invite-code-input"
          />
        </label>
        <div className="flex items-end gap-2">
          {SAMPLE_CODES.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setCode(sample)}
              className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-mono text-muted-foreground transition hover:bg-muted-hover"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <UrlPreview
          label="邀请落地页(给被邀请人看)"
          url={inviteUrl}
          description="打开后看到:你的身份卡 + 「使用邀请码注册」按钮 + 价值主张"
          onCopy={() => copy(inviteUrl)}
          copied={copied}
        />
        <UrlPreview
          label="直接跳到注册(已经走完点击的人)"
          url={registerUrl}
          description="把 invite= 自动填进表单的注册页,缩短一步漏斗"
          onCopy={() => copy(registerUrl)}
          copied={copied}
        />
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">
        配额规则(per 04 §1.2):每个 L1+ 用户 3 枚初始配额,被邀请人
        达到 L2 时返还 1 枚(上限 6)。M2 期间不开放自由发码,只走
        运营定向邀约。运营在 admin 控制台直接发码。
      </p>
    </SolidCard>
  )
}

function UrlPreview({
  label,
  url,
  description,
  onCopy,
  copied,
}: {
  label: string
  url: string
  description: string
  onCopy: () => void
  copied: "idle" | "ok" | "fail"
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted p-3">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
      <code className="mt-2 block break-all rounded bg-white px-2 py-1 text-[11px] text-foreground">
        {url}
      </code>
      <div className="mt-2">
        <SolidButton
          type="button"
          size="sm"
          variant="secondary"
          onClick={onCopy}
          data-testid="press-copy-invite-url"
        >
          {copied === "ok" ? "已复制" : copied === "fail" ? "复制失败" : "复制链接"}
        </SolidButton>
      </div>
    </div>
  )
}

import type { Metadata } from "next"

export const metadata: Metadata = { title: "帮助与内容安全 | 在场" }

export default function SupportPage() {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || "support@sinanapp.cn"

  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10 leading-7 sm:px-6">
      <header>
        <p className="text-sm font-semibold text-emerald-700">在场支持中心</p>
        <h1 className="mt-2 text-3xl font-bold">帮助与内容安全</h1>
        <p className="mt-2 text-muted-foreground">我们优先处理隐私泄露、身份暴露和人身攻击等高风险内容。</p>
      </header>
      <section>
        <h2 className="text-xl font-semibold">联系我们</h2>
        <p className="mt-2">账号、内容、隐私或举报问题，可以发送邮件至 <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>。请附上评价链接、问题描述和你希望我们采取的措施，不要在邮件中发送密码或工作凭证原件。</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">举报处理</h2>
        <p className="mt-2">公开评价支持人身攻击、隐私泄露、造谣、群体对立、批量垃圾内容、竞品刷评和公司控评等举报类型。一般举报会在24小时内进入人工处理，高风险隐私问题会优先处理。</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">账号与数据</h2>
        <p className="mt-2">你可以在 App 的“我的 → 账号与数据”中直接注销账号。隐私政策说明了账号信息、评价内容和认证凭证的使用、保存与删除方式。</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <a className="underline" href="/legal/privacy">查看隐私政策</a>
          <a className="underline" href="/legal/terms">查看用户协议</a>
        </div>
      </section>
    </article>
  )
}

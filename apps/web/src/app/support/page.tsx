import type { Metadata } from "next"

export const metadata: Metadata = { title: "帮助与内容安全 | 在场" }

export default function SupportPage() {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim()

  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10 leading-7 sm:px-6">
      <header>
        <p className="text-sm font-semibold text-emerald-700">在场支持中心</p>
        <h1 className="mt-2 text-3xl font-bold">帮助与内容安全</h1>
        <p className="mt-2 text-muted-foreground">我们优先处理隐私泄露、身份暴露和人身攻击等高风险内容。</p>
      </header>
      <section>
        <h2 className="text-xl font-semibold">联系我们</h2>
        <p className="mt-2">{supportEmail ? <>账号、内容或隐私问题，请联系 <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>。</> : "邀请测试期间，账号或隐私问题请联系邀请你的管理员。内容问题可使用评价内的举报入口。"}请附上相关页面链接和问题描述，不要发送密码或工作凭证原件。</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">举报处理</h2>
        <p className="mt-2">在评价菜单中选择“举报”，提交原因和相关信息。隐私泄露、身份暴露和人身攻击将优先处理。</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">账号与数据</h2>
        <p className="mt-2">你可以在<a className="underline" href="/settings/account">账号与数据</a>页面注销账号。隐私政策说明了账号信息和评价内容的使用、保存与删除方式。</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <a className="underline" href="/legal/privacy">查看隐私政策</a>
          <a className="underline" href="/legal/terms">查看用户协议</a>
        </div>
      </section>
    </article>
  )
}

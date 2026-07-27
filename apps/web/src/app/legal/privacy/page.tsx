import type { Metadata } from "next"

export const metadata: Metadata = { title: "隐私政策 | 司南" }

export default function PrivacyPage() {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim()
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10 leading-7 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold">司南隐私政策</h1>
        <p className="mt-2 text-sm text-muted-foreground">生效日期：2026 年 7 月 5 日</p>
      </header>
      <section><h2 className="text-xl font-semibold">我们收集的信息</h2><p className="mt-2">账号注册时收集邮箱或手机号及加密后的密码；发布评价时收集评分、文本和必要的反滥用信息；申请在职认证时仅处理完成认证所必需的凭证。</p></section>
      <section><h2 className="text-xl font-semibold">使用目的</h2><p className="mt-2">这些信息用于提供登录、匿名评价、内容审核、账号安全、反作弊和客户支持。司南不会向企业披露评价作者的身份，也不会出售个人信息。</p></section>
      <section><h2 className="text-xl font-semibold">匿名与公开内容</h2><p className="mt-2">公开页面使用匿名身份展示评价。为降低身份反推风险，样本不足时会合并部门或模糊职级。请勿在公开内容中填写姓名、联系方式等可识别信息。</p></section>
      <section><h2 className="text-xl font-semibold">服务提供方</h2><p className="mt-2">为运行服务，我们会使用云托管与数据库、验证邮件发送、错误监控等必要技术服务。服务提供方只能按司南指令处理提供服务所需的数据，不得用于独立营销或跨应用追踪。实际启用新的处理方前，我们会同步更新本政策与 App 隐私披露。</p></section>
      <section><h2 className="text-xl font-semibold">保存与删除</h2><div className="mt-2 space-y-3"><p>认证凭证审核完成后删除原件，仅保留认证结论和必要审核记录。验证码在注销时清除，不作为长期身份凭证保存。</p><p>你可在“账号与数据”页面注销账号。注销会立即清除邮箱、手机号、密码、头像、工作邮箱、匿名画像和反滥用指纹，并删除私聊及个人功能内容。已通过审核并公开的评价可能为维护公共信息完整性、审核和争议处理而保留，但会解除账号与匿名画像关联，不再用于识别作者。</p><p>确因法律义务、安全审计或未决争议需要保留的最小记录，仅在相应目的所需期限内保存，目的完成后删除或匿名化。</p></div></section>
      <section><h2 className="text-xl font-semibold">你的权利</h2><p className="mt-2">你可以访问、更正或删除个人信息，撤回同意，或注销账号。如需人工协助，请通过产品内举报与申诉入口提交请求。{supportEmail ? <>也可发送邮件至 <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>。</> : "正式发布前，本页面将公开生产支持邮箱。"}</p></section>
    </article>
  )
}

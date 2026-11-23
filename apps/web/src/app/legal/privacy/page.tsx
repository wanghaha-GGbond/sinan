import type { Metadata } from "next"

export const metadata: Metadata = { title: "隐私政策 | 在场" }

export default function PrivacyPage() {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim()
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10 leading-7 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold">在场隐私政策</h1>
        <p className="mt-2 text-sm text-muted-foreground">更新日期：2026 年 11 月 23 日</p>
      </header>
      <section><h2 className="text-xl font-semibold">对话活动与积分</h2><p className="mt-2">如你使用对话活动，我们保存你提交的报名问题、报名状态和处理说明，用于筛选参与者及安排交流。这些报名内容仅本人和有权限的活动管理者可见，不会自动进入公开纪要；参与安排仅向本场入选者展示。公开嘉宾资料和纪要由管理者在取得相关授权后发布。</p><p className="mt-2">使用积分时，我们保存任务领取日期、活动奖励依据、积分余额、冻结与扣除/退回流水及竞拍出价，用于防止重复发放、超额使用和处理活动。出价与余额不向其他用户公开，积分流水不复制报名问题或私密参与安排。活动管理者可核对本场出价，并使用参与者提供的已验证注册邮箱核发活动奖励。</p><p className="mt-2">撤回报名会清除报名问题、处理说明并放弃入选名额，积分处理遵循活动规则。注销会删除个人报名、积分账户和本人流水，未使用或冻结积分一并失效，并解除活动创建及审核记录中的账号关联。必要的最小审核记录按安全和争议处理目的保留，不复制报名问题或私密参与安排。请勿提交他人隐私或商业秘密。</p></section>
      <section><h2 className="text-xl font-semibold">工作打卡与公司趋势</h2><p className="mt-2">Pulse 保存你主动填写的精力、压力、可选工时和下班时间，个人明细仅自己可见。仅在你主动勾选参与并具有有效公司认证时，将当天精力和压力纳入该公司的统计。每个已结束日期至少有 30 个有效认证账号参与才展示结果，不公开个人明细、精确人数、个人工时或下班时间，不提供部门或岗位筛选。</p><p className="mt-2">你可在 Pulse 页面清除全部记录并撤回统计参与，注销也会清除个人打卡。公开统计会随有效记录变化而更新；已由他人保存的公开汇总或你主动分享的摘要无法撤回。参与人数门槛和取整降低识别风险，但不承诺绝对匿名。</p></section>
      <section><h2 className="text-xl font-semibold">公司论坛</h2><p className="mt-2">论坛保存你提交的公司话题、帖子、回复，以及关注、赞同和举报记录。帖子与回复使用匿名成员身份展示，审核后才会公开；关注列表仅自己可见。匿名展示不代表我们无法在内部处理账号关联，也不能避免正文中的经历细节被他人识别。请勿公开他人隐私。</p><p className="mt-2">你可删除自己的帖子或回复。注销会清除关注、赞同和未公开的投稿，并解除已公开帖子、回复与账号的作者关联；已公开内容可能为保持讨论完整而保留。必要的审核与举报记录按争议处理和安全目的保留，不向普通用户公开账号身份。</p></section>
      <section><h2 className="text-xl font-semibold">我们收集的信息</h2><p className="mt-2">账号注册时收集邮箱或手机号及加密后的密码；发布评价时收集评分、文本和必要的反滥用信息；申请在职认证时仅处理完成认证所必需的凭证。</p></section>
      <section><h2 className="text-xl font-semibold">使用目的</h2><p className="mt-2">这些信息用于提供登录、匿名评价、内容审核、账号安全、反作弊和客户支持。在场不会向企业披露评价作者的身份，也不会出售个人信息。</p></section>
      <section><h2 className="text-xl font-semibold">匿名与公开内容</h2><p className="mt-2">公开页面使用匿名身份展示评价。为降低身份反推风险，样本不足时会合并部门或模糊职级。请勿在公开内容中填写姓名、联系方式等可识别信息。</p></section>
      <section><h2 className="text-xl font-semibold">服务提供方</h2><p className="mt-2">为运行服务，我们会使用云托管与数据库、验证邮件发送、错误监控等必要技术服务。服务提供方只能按在场指令处理提供服务所需的数据，不得用于独立营销或跨应用追踪。实际启用新的处理方前，我们会同步更新本政策与 App 隐私披露。</p></section>
      <section><h2 className="text-xl font-semibold">保存与删除</h2><div className="mt-2 space-y-3"><p>认证凭证审核完成后删除原件，仅保留认证结论和必要审核记录。验证码在注销时清除，不作为长期身份凭证保存。</p><p>你可在“账号与数据”页面注销账号。注销会立即清除邮箱、手机号、密码、头像、工作邮箱、匿名画像和反滥用指纹，并删除私聊及个人功能内容。已通过审核并公开的评价可能为维护公共信息完整性、审核和争议处理而保留，但会解除账号与匿名画像关联，不再用于识别作者。</p><p>确因法律义务、安全审计或未决争议需要保留的最小记录，仅在相应目的所需期限内保存，目的完成后删除或匿名化。</p></div></section>
      <section><h2 className="text-xl font-semibold">你的权利</h2><p className="mt-2">你可以访问、更正或删除个人信息，撤回同意，或注销账号。如需人工协助，请通过产品内举报与申诉入口提交请求。{supportEmail ? <>也可发送邮件至 <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>。</> : "正式发布前，本页面将公开生产支持邮箱。"}</p></section>
    </article>
  )
}

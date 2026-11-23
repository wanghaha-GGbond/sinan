import type { Metadata } from "next"

export const metadata: Metadata = { title: "用户协议 | 在场" }

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10 leading-7 sm:px-6">
      <header><h1 className="text-3xl font-bold">在场用户协议</h1><p className="mt-2 text-sm text-muted-foreground">更新日期：2026 年 11 月 23 日</p></header>
      <section><h2 className="text-xl font-semibold">服务说明</h2><p className="mt-2">在场提供公司信息、匿名职场评价、评分、研报和社区审核服务。Beta 期间采用邀请制，功能与可用范围可能持续调整。</p></section>
      <section><h2 className="text-xl font-semibold">内容规则</h2><p className="mt-2">你应基于真实经历发布内容，不得造谣、冒充、骚扰、泄露个人隐私、发布违法信息或组织操纵评分。自由文本可能先审后发；违规内容可被限制展示或删除。</p></section>
      <section><h2 className="text-xl font-semibold">对话活动</h2><p className="mt-2">对话活动按页面标明的方式参加：免费报名由管理者筛选，积分竞拍按最高积分中选、同分按有效出价先后排序。每场积分竞拍仅 1 个名额，试点最多 50 位参与者。报名或出价不保证入选，请在“我的报名”查看结果；活动可能取消或调整。</p><p className="mt-2">积分只能通过已公布的站内任务或经核实的活动奖励获得，不可充值、购买、转让或提现，不兑换现金，不构成捐款或嘉宾报酬。出价时冻结积分，加价仅追加冻结差额；未中选、未中选前撤回或活动取消/下架时退回。中选确认时扣除，个人随后放弃不退回；活动取消仍退回已扣积分。请勿根据活动要求向任何人转账。</p><p className="mt-2">本站不提供现金竞拍、收款、捐赠或公益凭证。资金意向不是已确认方案或已完成捐赠。交流应围绕合法的工作经历和行业经验，不得买卖或泄露商业秘密、个人隐私或违法信息。公开嘉宾资料和访谈纪要须经相关人员授权，报名问题不会自动公开。</p></section>
      <section><h2 className="text-xl font-semibold">匿名边界</h2><p className="mt-2">在场会采用技术和产品措施保护匿名身份，但互联网服务无法承诺绝对匿名。请避免提交足以单独识别你或第三方的信息。</p></section>
      <section><h2 className="text-xl font-semibold">企业回应与申诉</h2><p className="mt-2">企业只能回应公开内容并通过申诉流程提出异议，不得购买作者身份或付费删帖。平台会保留审核与处置记录。</p></section>
      <section><h2 className="text-xl font-semibold">账号终止</h2><p className="mt-2">你可随时注销账号。注销后私人内容和直接身份信息按隐私政策清理；已审核公开内容可能在解除作者身份关联后继续展示。严重或重复违规可能导致账号暂停或终止；必要的最小审计记录仅按法律、安全和争议处理目的保留。</p></section>
    </article>
  )
}

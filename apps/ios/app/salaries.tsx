import { salaryInsights } from "../data"
import { InsightScreen } from "../components/InsightScreen"

export default function SalariesScreen() {
  const items = salaryInsights().map((item) => ({
    id: `${item.company.id}-${item.role}`,
    companyId: item.company.id,
    title: item.role,
    metric: item.score.toFixed(1),
    meta: `${item.company.shortName} · 中位参考：${item.median} · ${item.samples} 个样本`,
    body: `匿名薪资区间 ${item.range}。从现有评价里提取薪资区间、奖金兑现、调薪透明度和岗位样本，作为入职前的谈薪参考。`,
    tags: [item.company.industry, item.company.vibe],
  }))

  return (
    <InsightScreen
      navTitle="薪资"
      navSubtitle="岗位薪酬、样本量和兑现信号"
      heroVariant="emerald"
      eyebrow="薪资透明"
      heading="按岗位看匿名薪资与兑现信号"
      description="从现有评价里提取薪资区间、奖金兑现、调薪透明度和岗位样本，作为入职前的谈薪参考。"
      action="贡献薪资样本"
      actionHref="/submit"
      quickTags={["高兑现", "工程岗", "产品运营", "面试前谈薪", "奖金/调薪"]}
      items={items}
    />
  )
}

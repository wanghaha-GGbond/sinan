import { opportunityInsights } from "../data"
import { InsightScreen } from "../components/InsightScreen"

export default function JobsScreen() {
  const items = opportunityInsights().slice(0, 12).map((item) => ({
    id: `${item.company.id}-${item.role}`,
    companyId: item.company.id,
    title: item.role,
    metric: String(item.fitScore),
    meta: `${item.company.shortName} · ${item.company.city}`,
    body: `不是职位列表的搬运，而是把岗位、城市、方向分、风险标签和过来人提醒放在一起做决策。核心信号：${item.signal}`,
    tags: [item.company.stage, item.company.vibe, ...item.company.riskTags.slice(0, 1)],
    cta: "查看公司情报",
  }))

  return (
    <InsightScreen
      navTitle="机会"
      navSubtitle="岗位适配、成长信号和风险提示"
      heroVariant="risk"
      eyebrow="机会雷达"
      heading="先看岗位背后的公司体验"
      description="不是职位列表的搬运，而是把岗位、城市、方向分、风险标签和过来人提醒放在一起做决策。"
      action="搜索公司"
      actionHref="/search"
      items={items}
    />
  )
}

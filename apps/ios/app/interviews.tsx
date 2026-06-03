import { interviewInsights } from "../data"
import { InsightScreen } from "../components/InsightScreen"

export default function InterviewsScreen() {
  const items = interviewInsights().map((item) => ({
    id: item.company.id,
    companyId: item.company.id,
    title: item.company.name,
    metric: item.score.toFixed(1),
    meta: `${item.role} · ${item.rounds}`,
    body: item.signal,
    tags: item.company.riskTags.slice(0, 2),
    cta: "看公司",
  }))

  return (
    <InsightScreen
      navTitle="面试"
      navSubtitle="流程轮次、题感和候选人反馈"
      heroVariant="elevated"
      eyebrow="面试情报"
      heading="提前知道流程、轮次和真实体验"
      description="聚合面试者和过来人的匿名样本，帮助你确认轮次、等待时间、题目相关性和团队沟通方式。"
      action="写面试体验"
      actionHref="/submit"
      items={items}
    />
  )
}

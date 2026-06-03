import { communityInsights } from "../data"
import { InsightScreen } from "../components/InsightScreen"

export default function CommunityScreen() {
  const items = communityInsights().map((item) => ({
    id: item.id,
    companyId: item.company.id,
    title: item.company.name,
    metric: `${item.usefulCount}`,
    meta: `${item.type} · ${item.authorLabel}`,
    body: item.content,
    tags: item.tags,
    cta: "看公司讨论",
  }))

  return (
    <InsightScreen
      navTitle="社区"
      navSubtitle="匿名追问、高赞补充和细节确认"
      heroVariant="elevated"
      eyebrow="社区问答"
      heading="把评价后面的追问也看见"
      description="Glassdoor 式社区能力映射到司南：围绕一条评价继续追问、补充、打码展示，并保留匿名身份保护。"
      action="发起新评价"
      actionHref="/submit"
      items={items}
    />
  )
}

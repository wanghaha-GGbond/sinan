import { benefitInsights } from "../data"
import { InsightScreen } from "../components/InsightScreen"

export default function BenefitsScreen() {
  const items = benefitInsights().map((item) => ({
    id: item.company.id,
    companyId: item.company.id,
    title: item.company.name,
    metric: item.officeScore.toFixed(1),
    meta: `${item.company.city} · ${item.headline}`,
    body: `聚合办公环境、通勤、食堂、下午茶、工位和设备等匿名样本。${item.signals.join(" / ")}`,
    tags: item.company.highlights.slice(0, 2),
  }))

  return (
    <InsightScreen
      navTitle="福利"
      navSubtitle="办公、通勤、食堂和真实体验"
      heroVariant="emerald"
      eyebrow="福利与办公体验"
      heading="把福利从口号拆成真实体验"
      description="聚合办公环境、通勤、食堂、下午茶、工位和设备等匿名样本，保留司南的“公司体感”表达。"
      action="补充办公体验"
      actionHref="/submit"
      items={items}
    />
  )
}

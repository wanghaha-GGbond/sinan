import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Link, router } from "expo-router"
import { MobileCompany, companySnapshot } from "../data"
import { COLORS, RADIUS } from "../theme"
import { SolidButton } from "./SolidButton"
import { SolidCard } from "./SolidCard"
import { TagPill } from "./SinanPrimitives"

export function CompanyIntelligencePanel({ company }: { company: MobileCompany }) {
  const snapshot = companySnapshot(company.id)
  const cards = [
    { label: "薪资", value: snapshot.salary, detail: `${snapshot.salarySamples} 个匿名样本 · 兑现分 ${snapshot.payScore}`, href: "/salaries" },
    { label: "面试", value: snapshot.interviewScore, detail: `${snapshot.interviewCount} 条流程/体验信号`, href: "/interviews" },
    { label: "机会", value: `${snapshot.roles} 类岗位`, detail: snapshot.topRole, href: "/jobs" },
    { label: "福利", value: String(snapshot.benefits), detail: "办公、通勤、食堂和设备体验", href: "/benefits" },
    { label: "社区", value: `${snapshot.discussions}`, detail: "追问、补充和过来人讨论", href: "/community" },
  ]

  return (
    <SolidCard variant="elevated" style={S.panel}>
      <View style={S.head}>
        <View style={{ flex: 1 }}>
          <View style={S.badge}>
            <Text style={S.badgeText}>职场情报概览</Text>
          </View>
          <Text style={S.title}>像看公司说明书一样看清这家公司</Text>
          <Text style={S.desc}>
            保留司南的方向分与匿名保护，同时把薪资、面试、机会和风险提示集中到一个可决策面板。
          </Text>
        </View>
        <SolidButton title="补充情报" size="sm" onPress={() => router.push("/submit")} />
      </View>

      <View style={S.grid}>
        {cards.map((card) => (
          <Link key={card.label} href={card.href as never} asChild>
            <TouchableOpacity activeOpacity={0.92} style={S.intelCard}>
              <Text style={S.cardLabel}>{card.label}</Text>
              <Text style={S.cardValue}>{card.value}</Text>
              <Text style={S.cardDetail} numberOfLines={2}>{card.detail}</Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>

      <View style={S.tags}>
        {company.roles.map((role) => (
          <TagPill key={role} tone="neutral">{role}</TagPill>
        ))}
        {company.riskTags.slice(0, 2).map((tag) => (
          <TagPill key={tag} tone="risk">#{tag}</TagPill>
        ))}
      </View>
    </SolidCard>
  )
}

const S = StyleSheet.create({
  panel: { padding: 18 },
  head: { gap: 12 },
  badge: {
    alignSelf: "flex-start", borderRadius: 999,
    backgroundColor: COLORS.primarySoft, paddingHorizontal: 12, paddingVertical: 6,
  },
  badgeText: { fontSize: 12, fontWeight: "800", color: COLORS.primaryForeground },
  title: { marginTop: 12, fontSize: 20, lineHeight: 26, fontWeight: "800", color: COLORS.ink },
  desc: { marginTop: 8, fontSize: 14, lineHeight: 22, color: COLORS.muted },
  grid: { marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  intelCard: {
    width: "48%", minHeight: 118, borderRadius: 24, borderWidth: 1,
    borderColor: COLORS.borderSoft, backgroundColor: "#F8FAF4", padding: 14,
  },
  cardLabel: { fontSize: 13, fontWeight: "800", color: COLORS.ink },
  cardValue: { marginTop: 14, fontSize: 21, fontWeight: "800", color: COLORS.ink },
  cardDetail: { marginTop: 5, fontSize: 11, lineHeight: 16, color: COLORS.muted },
  tags: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 },
})

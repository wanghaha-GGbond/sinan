import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { Link } from "expo-router"
import { ArrowRight, Building2, ShieldCheck, Star, Users } from "lucide-react-native"

import { COLORS, RADIUS } from "../../theme"
import { SolidButton } from "../../components/SolidButton"
import { SolidCard } from "../../components/SolidCard"
import { ScoreChip, SolidTopbar, TagPill } from "../../components/SinanPrimitives"
import { claimedCompanyIds, companies } from "../../data"

export default function CompanyPortalIndexScreen() {
  const claimed = companies.filter((c) => claimedCompanyIds.includes(c.id))
  const unbound = companies.filter((c) => !claimedCompanyIds.includes(c.id)).slice(0, 3)

  return (
    <View style={S.container}>
      <CompanyPortalBanner />
      <ScrollView contentContainerStyle={S.content}>
        <SolidTopbar title="公司控制台" subtitle="查看你公司的镜像数据" back />

        <View style={S.headBlock}>
          <Text style={S.heading}>公司控制台</Text>
          <Text style={S.sub}>
            查看你公司当前的公开评分、趋势、标签分布与公开评价。
            公司端只能「看镜子」,无法修改评分或影响展示。
          </Text>
        </View>

        <SolidCard variant="elevated" style={S.section} testID="company-portal-claimed">
          <View style={S.sectionHead}>
            <Text style={S.sectionTitle}>已认领公司</Text>
            <Text style={S.sectionMeta}>{claimed.length} 家</Text>
          </View>
          {claimed.length === 0 ? (
            <Text style={S.emptyText}>
              你还没有认领任何公司。认领后这里会展示你公司的镜像。
            </Text>
          ) : (
            <View style={S.list}>
              {claimed.map((company) => (
                <Link
                  key={company.id}
                  href={`/company-portal/${company.id}`}
                  asChild
                  testID={`company-portal-card-${company.id}`}
                >
                  <TouchableOpacity activeOpacity={0.9} style={S.claimItem}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={S.claimHead}>
                        <Building2 size={14} color={COLORS.primaryForeground} />
                        <Text style={S.claimName} numberOfLines={1}>
                          {company.shortName}
                        </Text>
                      </View>
                      <Text style={S.claimMeta}>
                        {company.industry} · {company.city} · {company.size}
                      </Text>
                      <Text style={S.claimMeta}>
                        {company.reviewCount.toLocaleString()} 条公开评价 ·{" "}
                        {company.recommendationRate}% 推荐
                      </Text>
                    </View>
                    <View style={S.claimRight}>
                      <ScoreChip score={company.directionScore} compact />
                      <View style={S.openRow}>
                        <Text style={S.openText}>打开控制台</Text>
                        <ArrowRight size={12} color={COLORS.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                </Link>
              ))}
            </View>
          )}
        </SolidCard>

        <SolidCard variant="subtle" style={S.section}>
          <Text style={S.sectionTitle}>公司端能做什么</Text>
          <View style={S.capList}>
            <CapLine
              icon={<ShieldCheck size={14} color={COLORS.primary} />}
              text="查看公司当前方向分、评分趋势、标签分布"
            />
            <CapLine
              icon={<Users size={14} color={COLORS.primary} />}
              text="浏览公开评价(只读)"
            />
            <CapLine
              icon={<Star size={14} color={COLORS.primary} />}
              text="提交公司基础信息修正(名称、规模、城市、官网等)"
            />
            <CapLine
              icon={<ShieldCheck size={14} color={COLORS.primary} />}
              text="对明显违规评价提交申诉(可附举证)"
            />
          </View>
          <Text style={S.footnote}>
            公司端不能删评价、修改评分、购买排名或获取评价用户身份,任何此类请求都会被司南拒绝。
          </Text>
        </SolidCard>

        <SolidCard variant="subtle" style={S.section}>
          <Text style={S.sectionTitle}>你还没认领的公司</Text>
          <Text style={S.footnote}>
            提交工商资质后,司南会人工审核并开通控制台。下面是一些示例公司。
          </Text>
          <View style={S.unboundRow}>
            {unbound.map((company) => (
              <View key={company.id} style={S.unboundPill}>
                <Text style={S.unboundText}>{company.shortName}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 12 }}>
            <Link href="/search" asChild>
              <View style={S.ghostBtn}>
                <Text style={S.ghostText}>先看看公开数据</Text>
              </View>
            </Link>
          </View>
        </SolidCard>
      </ScrollView>
    </View>
  )
}

function CapLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={S.capLine}>
      {icon}
      <Text style={S.capText}>{text}</Text>
    </View>
  )
}

function CompanyPortalBanner() {
  return (
    <View style={S.banner}>
      <View style={S.bannerInner}>
        <View style={S.bannerLeft}>
          <Building2 size={14} color="#FFFFFF" />
          <Text style={S.bannerTitle}>公司控制台</Text>
          <Text style={S.bannerSub}>· 你正在以公司身份查看</Text>
        </View>
        <View style={S.bannerRight}>
          <ShieldCheck size={12} color="rgba(255,255,255,0.7)" />
          <Text style={S.bannerRightText}>匿名保护</Text>
        </View>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  banner: {
    backgroundColor: COLORS.dark,
    paddingVertical: 10,
  },
  bannerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  bannerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  bannerTitle: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  bannerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  bannerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  bannerRightText: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  headBlock: { gap: 6 },
  heading: { fontSize: 22, fontWeight: "800", color: COLORS.ink },
  sub: { fontSize: 13, lineHeight: 20, color: COLORS.muted },
  section: { padding: 16, gap: 12 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  sectionMeta: { fontSize: 12, color: COLORS.muted },
  emptyText: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
  list: { gap: 10 },
  claimItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.border}99`,
    backgroundColor: COLORS.surfaceMuted,
  },
  claimHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  claimName: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  claimMeta: { marginTop: 4, fontSize: 12, color: COLORS.muted },
  claimRight: { alignItems: "flex-end", gap: 6 },
  openRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  openText: { fontSize: 12, fontWeight: "800", color: COLORS.primary },
  capList: { gap: 8 },
  capLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  capText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  footnote: { fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  unboundRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  unboundPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceHover,
  },
  unboundText: { fontSize: 12, color: COLORS.textSecondary },
  ghostBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceHover,
  },
  ghostText: { fontSize: 13, fontWeight: "800", color: COLORS.inkSoft },
})

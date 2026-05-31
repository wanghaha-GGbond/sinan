import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { Link, router } from "expo-router"
import { COLORS, RADIUS, PRODUCT, SHADOWS } from "../theme"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"

type Company = {
  id: string; name: string; shortName: string; industry: string; city: string
  size: string; stage: string; directionScore: number; recommendationRate: number
  reviewCount: number; recentReviewCount: number; recommendReason: string
  highlights: string[]; riskTags: string[]
}

type Review = {
  id: string; companyId: string; title: string; content: string
  authorLabel: string; authorRole: string; directionScore: number
  usefulCount: number; createdAt: string
}

const COMPANIES: Company[] = [
  {
    id: "1", name: "北极星科技", shortName: "北极星", industry: "互联网", city: "北京",
    size: "1000-5000人", stage: "C轮", directionScore: 4.2, recommendationRate: 78,
    reviewCount: 342, recentReviewCount: 23, recommendReason: "技术驱动",
    highlights: ["技术氛围好", "扁平管理"], riskTags: ["加班"],
  },
  {
    id: "2", name: "深蓝数据", shortName: "深蓝", industry: "大数据", city: "上海",
    size: "500-1000人", stage: "B轮", directionScore: 3.8, recommendationRate: 65,
    reviewCount: 156, recentReviewCount: 12, recommendReason: "新人友好",
    highlights: ["弹性工作"], riskTags: [],
  },
  {
    id: "3", name: "万象互动", shortName: "万象", industry: "游戏", city: "深圳",
    size: "100-500人", stage: "A轮", directionScore: 3.2, recommendationRate: 45,
    reviewCount: 89, recentReviewCount: 5, recommendReason: "创意氛围",
    highlights: ["免费三餐"], riskTags: ["加班", "管理混乱"],
  },
]

const REVIEWS: Review[] = [
  { id: "r1", companyId: "1", title: "技术氛围真的很棒", content: "来北极星两年了，最大的感受是技术驱动。代码review严格但收获大。", authorLabel: "在职员工", authorRole: "后端开发", directionScore: 4.5, usefulCount: 128, createdAt: "2小时前" },
  { id: "r2", companyId: "2", title: "适合新人成长", content: "后期管理层变动频繁，方向经常调整。对新人友好。", authorLabel: "已离职", authorRole: "产品经理", directionScore: 3.2, usefulCount: 56, createdAt: "1天前" },
]

export default function HomeScreen() {
  return (
    <View style={S.container}>
      {/* SolidTopbar — 对齐 Web HomeHeader */}
      <View style={S.topbar}>
        <View style={S.topbarLeft}>
          <View style={S.brandIcon}>
            <Text style={S.brandIconText}>🧭</Text>
          </View>
          <Text style={S.topbarTitle}>司南 推荐</Text>
        </View>
        <View style={S.topbarRight}>
          <TouchableOpacity onPress={() => router.push("/search")}>
            <Text style={S.topbarSearch}>🔍 搜索</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={S.scrollContent}>
        {/* Hero — 对齐 Web brand hero */}
        <SolidCard variant="hero" style={S.hero}>
          <View style={S.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={S.heroTitle}>推荐</Text>
              <Text style={S.heroSubtitle}>最近被关注</Text>
            </View>
            <Text style={S.heroCompass}>🧭</Text>
          </View>
          <View style={S.preferencePill}>
            <Text style={S.preferenceText}>你的方向：互联网 / 北京</Text>
          </View>
        </SolidCard>

        {/* Company cards */}
        {COMPANIES.map((c) => (
          <Link key={c.id} href={`/company/${c.id}`} asChild>
            <TouchableOpacity activeOpacity={0.95}>
              <SolidCard variant="default" style={S.companyCard}>
                {/* Reason tag */}
                <View style={S.reasonRow}>
                  <View style={S.reasonTag}>
                    <Text style={S.reasonTagText}>{c.recommendReason}</Text>
                  </View>
                </View>

                {/* Company name + score */}
                <View style={S.companyHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={S.companyName}>{c.name}</Text>
                    <Text style={S.companyMeta}>{c.industry} · {c.city} · {c.size}</Text>
                  </View>
                  <View style={S.scoreChip}>
                    <Text style={S.scoreText}>{c.directionScore}</Text>
                  </View>
                </View>

                {/* Stats */}
                <View style={S.statsRow}>
                  <View style={S.statItem}>
                    <Text style={S.statVal}>{c.recommendationRate}%</Text>
                    <Text style={S.statLabel}>推荐入职</Text>
                  </View>
                  <View style={S.statDivider} />
                  <View style={S.statItem}>
                    <Text style={S.statVal}>{c.reviewCount}</Text>
                    <Text style={S.statLabel}>条评价</Text>
                  </View>
                  <View style={S.statDivider} />
                  <View style={S.statItem}>
                    <Text style={S.statVal}>+{c.recentReviewCount}</Text>
                    <Text style={S.statLabel}>近7天</Text>
                  </View>
                </View>

                {/* Tags */}
                {c.highlights.length > 0 && (
                  <View style={S.tagRow}>
                    {c.highlights.map((t) => (
                      <View key={t} style={S.highlightTag}>
                        <Text style={S.highlightTagText}>{t}</Text>
                      </View>
                    ))}
                    {c.riskTags.map((t) => (
                      <View key={t} style={S.riskTag}>
                        <Text style={S.riskTagText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Preview review */}
                {REVIEWS.filter((r) => r.companyId === c.id).slice(0, 1).map((r) => (
                  <View key={r.id} style={S.reviewPreview}>
                    <Text style={S.previewLabel}>💬 {r.authorLabel} · {r.authorRole}</Text>
                    <Text style={S.previewText} numberOfLines={2}>「{r.content}」</Text>
                  </View>
                ))}

                {/* CTA */}
                <SolidButton title="看这家公司" variant="primary" size="sm" style={{ alignSelf: "flex-end", marginTop: 8 }} />
              </SolidCard>
            </TouchableOpacity>
          </Link>
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Topbar
  topbar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 10,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.hero,
  },
  topbarLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center", justifyContent: "center",
    ...SHADOWS.iconContainer,
  },
  brandIconText: { fontSize: 16 },
  topbarTitle: { fontSize: 16, fontWeight: "700", color: COLORS.ink },
  topbarRight: {},
  topbarSearch: {
    fontSize: 13, fontWeight: "700", color: "#FFFFFF",
    backgroundColor: COLORS.dark, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.lg, overflow: "hidden",
  },

  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  // Hero
  hero: { padding: 16, marginBottom: 16, borderRadius: RADIUS["2xl"] },
  heroRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroTitle: { fontSize: 16, fontWeight: "700", color: COLORS.ink },
  heroSubtitle: { fontSize: 14, color: COLORS.muted },
  heroCompass: { fontSize: 18 },
  preferencePill: {
    marginTop: 8, backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    alignSelf: "flex-start",
  },
  preferenceText: { fontSize: 12, color: COLORS.primaryForeground },

  // Company card
  companyCard: { padding: 16, marginBottom: 12 },
  reasonRow: { marginBottom: 12 },
  reasonTag: {
    backgroundColor: COLORS.primarySoft, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, alignSelf: "flex-start",
  },
  reasonTagText: { fontSize: 12, fontWeight: "600", color: COLORS.primaryForeground },

  companyHead: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  companyName: { fontSize: 17, fontWeight: "700", color: COLORS.ink, flex: 1 },
  companyMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  scoreChip: {
    backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  scoreText: { fontSize: 16, fontWeight: "800", color: COLORS.primary },

  // Stats
  statsRow: {
    flexDirection: "row", paddingVertical: 12,
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: COLORS.border, marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 15, fontWeight: "700", color: COLORS.ink },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border },

  // Tags
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  highlightTag: {
    backgroundColor: COLORS.primarySoft, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10,
  },
  highlightTagText: { fontSize: 11, color: COLORS.primaryForeground },
  riskTag: {
    backgroundColor: COLORS.riskSoft, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10,
  },
  riskTagText: { fontSize: 11, color: COLORS.riskForeground },

  // Review preview
  reviewPreview: {
    backgroundColor: COLORS.surfaceMuted, padding: 12,
    borderRadius: RADIUS.md, marginBottom: 4,
  },
  previewLabel: { fontSize: 12, color: COLORS.primary, fontWeight: "600", marginBottom: 4 },
  previewText: { fontSize: 13, color: COLORS.inkSoft, lineHeight: 20 },
})

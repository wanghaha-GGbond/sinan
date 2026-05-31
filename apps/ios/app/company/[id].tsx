import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native"
import { Link, router, useLocalSearchParams } from "expo-router"
import { COLORS, RADIUS, PRODUCT, SHADOWS } from "../../theme"
import { SolidButton } from "../../components/SolidButton"
import { SolidCard } from "../../components/SolidCard"
import { SolidInput } from "../../components/SolidInput"

const DATA: Record<string, any> = {
  "1": { name: "北极星科技", shortName: "北极星", industry: "互联网", city: "北京", size: "1000-5000人", stage: "C轮", directionScore: 4.2, recommendationRate: 78, reviewCount: 342, highlights: ["技术氛围好", "扁平管理"], riskTags: ["加班"] },
  "2": { name: "深蓝数据", shortName: "深蓝", industry: "大数据", city: "上海", size: "500-1000人", stage: "B轮", directionScore: 3.8, recommendationRate: 65, reviewCount: 156, highlights: ["弹性工作"], riskTags: [] },
}

const REVIEWS = [
  { id: "r1", title: "技术氛围真的很棒", content: "来北极星两年了，最大的感受是技术驱动。代码review严格但也很有收获，同事都很靠谱。", authorLabel: "在职员工", authorRole: "后端开发", directionScore: 4.5, usefulCount: 128, discussionCount: 23, createdAt: "2小时前" },
  { id: "r2", title: "适合新人成长", content: "入职时团队氛围很好。后期管理层变动频繁，方向经常调整。", authorLabel: "已离职", authorRole: "产品经理", directionScore: 3.2, usefulCount: 56, discussionCount: 8, createdAt: "1天前" },
]

export default function CompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = DATA[id ?? "1"]
  const [filter, setFilter] = useState<string | null>(null)
  const reviews = filter ? REVIEWS.filter((r) => r.authorLabel === filter || r.authorRole === filter) : REVIEWS

  if (!c) return <Text style={S.empty}>未找到公司</Text>

  return (
    <ScrollView style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={S.back}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>{c.name}</Text>
        <TouchableOpacity onPress={() => router.push(`/submit?companyId=${id}&companyName=${c.shortName}`)}>
          <Text style={S.submitLink}>✏️ 评价</Text>
        </TouchableOpacity>
      </View>

      {/* Meta */}
      <View style={S.metaRow}>
        <Text style={S.metaText}>{c.industry} · {c.city} · {c.size} · {c.stage}</Text>
      </View>

      {/* Stats */}
      <SolidCard variant="default" style={S.statsCard}>
        <View style={S.statItem}>
          <Text style={S.statValue}>{c.directionScore}</Text>
          <Text style={S.statLabel}>{PRODUCT.scoreName}</Text>
        </View>
        <View style={S.statDivider} />
        <View style={S.statItem}>
          <Text style={[S.statValue, { color: COLORS.gold }]}>{c.recommendationRate}%</Text>
          <Text style={S.statLabel}>推荐入职率</Text>
        </View>
        <View style={S.statDivider} />
        <View style={S.statItem}>
          <Text style={S.statValue}>{c.reviewCount}</Text>
          <Text style={S.statLabel}>评价数</Text>
        </View>
      </SolidCard>

      {/* Tags */}
      <View style={S.tagRow}>
        {c.highlights.map((t: string) => (
          <View key={t} style={S.highlightTag}>
            <Text style={S.highlightTagText}>{t}</Text>
          </View>
        ))}
        {c.riskTags.map((t: string) => (
          <View key={t} style={S.riskTag}>
            <Text style={S.riskTagText}>{t}</Text>
          </View>
        ))}
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.filterRow}>
        {["全部", "在职员工", "已离职"].map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f === "全部" ? null : f)}>
            <Text style={[S.filterChip, (f === "全部" ? !filter : filter === f) && S.filterActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reviews */}
      {reviews.map((r) => (
        <Link key={r.id} href={`/review/${r.id}?companyId=${id}`} asChild>
          <TouchableOpacity activeOpacity={0.95}>
            <SolidCard variant="default" style={S.reviewCard}>
              <View style={S.reviewHead}>
                <View style={S.avatar}>
                  <Text style={S.avatarText}>{r.authorLabel[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.authorLabel}>{r.authorLabel} · {r.authorRole}</Text>
                  <Text style={S.reviewTime}>{r.createdAt}</Text>
                </View>
                <Text style={S.reviewScore}>⭐ {r.directionScore}</Text>
              </View>
              <Text style={S.reviewTitle}>{r.title}</Text>
              <Text style={S.reviewContent} numberOfLines={3}>{r.content}</Text>
              <View style={S.reviewFoot}>
                <Text style={S.footText}>👍 {r.usefulCount}</Text>
                <Text style={S.footText}>💬 {r.discussionCount}</Text>
              </View>
            </SolidCard>
          </TouchableOpacity>
        </Link>
      ))}

      <View style={{ height: 60 }} />
    </ScrollView>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  empty: { padding: 40, textAlign: "center", color: COLORS.muted },

  header: {
    padding: 16, paddingTop: 56, backgroundColor: COLORS.dark,
    flexDirection: "row", alignItems: "center",
  },
  back: { color: "#FFF", fontSize: 20, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#FFF" },
  submitLink: { color: COLORS.primary, fontSize: 14, fontWeight: "700" },

  metaRow: { padding: 16, paddingBottom: 8 },
  metaText: { fontSize: 13, color: COLORS.muted },

  statsCard: {
    marginHorizontal: 16, padding: 16,
    flexDirection: "row", justifyContent: "space-around",
    borderRadius: RADIUS["2xl"],
  },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "800", color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: COLORS.border },

  tagRow: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 6, paddingVertical: 12 },
  highlightTag: { backgroundColor: COLORS.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  highlightTagText: { fontSize: 11, color: COLORS.primaryForeground },
  riskTag: { backgroundColor: COLORS.riskSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  riskTagText: { fontSize: 11, color: COLORS.riskForeground },

  filterRow: { paddingHorizontal: 16, marginBottom: 8 },
  filterChip: {
    fontSize: 13, paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: COLORS.surfaceHover, borderRadius: 20,
    marginRight: 8, color: COLORS.ink, overflow: "hidden",
  },
  filterActive: { backgroundColor: COLORS.primary, color: "#FFF" },

  reviewCard: { marginHorizontal: 16, marginBottom: 12, padding: 16 },
  reviewHead: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary,
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  avatarText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  authorLabel: { fontSize: 13, fontWeight: "600", color: COLORS.ink },
  reviewTime: { fontSize: 11, color: COLORS.muted },
  reviewScore: { fontSize: 13, fontWeight: "700", color: COLORS.gold },
  reviewTitle: { fontSize: 15, fontWeight: "600", color: COLORS.ink, marginBottom: 6 },
  reviewContent: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  reviewFoot: { flexDirection: "row", gap: 16, marginTop: 10 },
  footText: { fontSize: 12, color: COLORS.muted },
})

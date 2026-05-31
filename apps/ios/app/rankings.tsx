import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Link } from "expo-router"
import { COLORS, RADIUS, PRODUCT, SHADOWS } from "../theme"
import { SolidCard } from "../components/SolidCard"

const COMPANIES = [
  { id: "1", name: "北极星科技", industry: "互联网", city: "北京", directionScore: 4.2, reviewCount: 342 },
  { id: "2", name: "深蓝数据", industry: "大数据", city: "上海", directionScore: 3.8, reviewCount: 156 },
  { id: "3", name: "万象互动", industry: "游戏", city: "深圳", directionScore: 3.2, reviewCount: 89 },
]

export default function RankingsScreen() {
  const byScore = [...COMPANIES].sort((a, b) => b.directionScore - a.directionScore)

  return (
    <View style={S.container}>
      <View style={S.header}>
        <Text style={S.headerTitle}>榜单</Text>
      </View>
      <Text style={S.sectionTitle}>{PRODUCT.scoreName}排行</Text>
      {byScore.map((c, i) => (
        <Link key={c.id} href={`/company/${c.id}`} asChild>
          <TouchableOpacity activeOpacity={0.95}>
            <SolidCard variant="default" style={S.row}>
              <Text style={[S.rank, i < 3 && { color: COLORS.gold }]}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.name}>{c.name}</Text>
                <Text style={S.meta}>{c.industry} · {c.city} · {c.reviewCount}条评价</Text>
              </View>
              <View style={S.scoreBadge}>
                <Text style={S.scoreText}>⭐ {c.directionScore}</Text>
              </View>
            </SolidCard>
          </TouchableOpacity>
        </Link>
      ))}
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    padding: 20, paddingTop: 56, backgroundColor: COLORS.dark,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  sectionTitle: {
    fontSize: 16, fontWeight: "700", color: COLORS.ink,
    padding: 16, paddingBottom: 8,
  },
  row: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 8, padding: 16,
  },
  rank: { fontSize: 18, fontWeight: "800", color: COLORS.muted, width: 32 },
  name: { fontSize: 15, fontWeight: "600", color: COLORS.ink },
  meta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  scoreBadge: {
    backgroundColor: COLORS.primarySoft, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  scoreText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
})

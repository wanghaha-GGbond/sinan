import { useState } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native"
import { Link, router } from "expo-router"
import { COLORS, RADIUS, SHADOWS } from "../theme"
import { SolidInput } from "../components/SolidInput"

const COMPANIES = [
  { id: "1", name: "北极星科技", industry: "互联网", city: "北京", size: "1000-5000人", directionScore: 4.2, reviewCount: 342 },
  { id: "2", name: "深蓝数据", industry: "大数据", city: "上海", size: "500-1000人", directionScore: 3.8, reviewCount: 156 },
  { id: "3", name: "万象互动", industry: "游戏", city: "深圳", size: "100-500人", directionScore: 3.2, reviewCount: 89 },
]

export default function SearchScreen() {
  const [q, setQ] = useState("")
  const results = q ? COMPANIES.filter((c) => c.name.includes(q) || c.industry.includes(q) || c.city.includes(q)) : COMPANIES

  return (
    <View style={S.container}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={S.back}>←</Text>
        </TouchableOpacity>
        <View style={S.inputWrap}>
          <SolidInput
            placeholder="搜索公司、行业、城市..."
            value={q}
            onChangeText={setQ}
            autoFocus
            style={{ backgroundColor: COLORS.surfaceHover }}
          />
        </View>
      </View>
      <FlatList
        data={results}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Link href={`/company/${item.id}`} asChild>
            <TouchableOpacity activeOpacity={0.95} style={S.row}>
              <View style={{ flex: 1 }}>
                <Text style={S.name}>{item.name}</Text>
                <Text style={S.meta}>{item.industry} · {item.city} · {item.size}</Text>
              </View>
              <View style={S.scoreBadge}>
                <Text style={S.scoreText}>⭐ {item.directionScore}</Text>
              </View>
            </TouchableOpacity>
          </Link>
        )}
      />
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    padding: 16, paddingTop: 56, backgroundColor: COLORS.dark,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  back: { color: "#FFF", fontSize: 18, fontWeight: "600" },
  inputWrap: { flex: 1 },
  row: {
    flexDirection: "row", alignItems: "center", padding: 16,
    backgroundColor: COLORS.surface, marginBottom: 8,
    borderRadius: RADIUS["2xl"], borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.cardSubtle,
  },
  name: { fontSize: 15, fontWeight: "600", color: COLORS.ink },
  meta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  scoreBadge: {
    backgroundColor: COLORS.primarySoft, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  scoreText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
})

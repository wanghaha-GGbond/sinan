import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { COLORS, RADIUS, SHADOWS } from "../../theme"
import { SolidCard } from "../../components/SolidCard"

const REVIEWS: Record<string, any> = {
  "r1": {
    title: "技术氛围真的很棒", authorLabel: "在职员工", authorRole: "后端开发",
    directionScore: 4.5, usefulCount: 128, discussionCount: 23, createdAt: "2小时前",
    city: "北京", employmentStatus: "在职",
    content: "来北极星两年了，最大的感受是技术驱动。代码review严格但也很有收获，同事都很靠谱。加班确实有但项目忙完会给调休。薪资在行业里算中上。整体来说推荐技术方向的朋友来。",
  },
  "r2": {
    title: "适合新人成长，但天花板明显", authorLabel: "已离职", authorRole: "产品经理",
    directionScore: 3.2, usefulCount: 56, discussionCount: 8, createdAt: "1天前",
    city: "北京", employmentStatus: "已离职",
    content: "入职时是22年，当时团队氛围很好。后期管理层变动频繁，方向经常调整。对新人友好，但想往上走比较难。整体还行吧。",
  },
}

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const r = REVIEWS[id ?? "r1"]
  const [useful, setUseful] = useState(false)

  if (!r) return <Text style={S.empty}>未找到评价</Text>

  return (
    <ScrollView style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={S.back}>←</Text>
        </TouchableOpacity>
        <Text style={S.headerTitle}>评价详情</Text>
      </View>

      <SolidCard variant="default" style={S.card}>
        {/* Author */}
        <View style={S.authorRow}>
          <View style={S.avatar}>
            <Text style={S.avatarText}>{r.authorLabel[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.authorName}>{r.authorLabel}</Text>
            <Text style={S.authorMeta}>{r.authorRole} · {r.employmentStatus} · {r.city} · {r.createdAt}</Text>
          </View>
          <View style={S.scoreBadge}>
            <Text style={S.scoreText}>⭐ {r.directionScore}</Text>
          </View>
        </View>

        <Text style={S.title}>{r.title}</Text>
        <Text style={S.content}>{r.content}</Text>
      </SolidCard>

      {/* Actions */}
      <View style={S.actions}>
        <TouchableOpacity
          style={[S.actionBtn, useful && S.actionActive]}
          onPress={() => setUseful(!useful)}
        >
          <Text style={[S.actionText, useful && S.actionTextActive]}>
            👍 有用 {r.usefulCount + (useful ? 1 : 0)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.actionBtn}>
          <Text style={S.actionText}>💬 讨论 {r.discussionCount}</Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFF" },

  card: { margin: 16, padding: 20 },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  avatarText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  authorName: { fontSize: 15, fontWeight: "600", color: COLORS.ink },
  authorMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  scoreBadge: {
    backgroundColor: COLORS.primarySoft, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  scoreText: { fontSize: 14, fontWeight: "700", color: COLORS.primary },

  title: { fontSize: 18, fontWeight: "700", color: COLORS.ink, marginBottom: 12 },
  content: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 24 },

  actions: { flexDirection: "row", paddingHorizontal: 16, gap: 12 },
  actionBtn: {
    flex: 1, padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, alignItems: "center",
  },
  actionActive: { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary },
  actionText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: "600" },
  actionTextActive: { color: COLORS.primary },
})

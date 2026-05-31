import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { COLORS, RADIUS, PRODUCT, SHADOWS } from "../theme"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"

export default function MeScreen() {
  const user = {
    displayName: "指路人#042",
    id: "dev-001",
    trustLevel: 3,
    directionPoints: 1280,
    nextLevelPoints: 1500,
    streakDays: 7,
    helpedCount: 128,
    badges: ["第一次指路", "连续点灯 7 天", "高赞真实体验", "薪资贡献者"],
  }

  const dailyTasks = [
    { id: "1", title: "查看 1 家公司", rewardPoints: 5, progress: 1, target: 1, completed: true },
    { id: "2", title: "给 1 条评价点有用", rewardPoints: 5, progress: 0, target: 1, completed: false },
    { id: "3", title: "匿名评价一家公司", rewardPoints: 15, progress: 0, target: 1, completed: false },
  ]

  const levelGap = user.nextLevelPoints - user.directionPoints
  const levelProgress = Math.round((user.directionPoints / user.nextLevelPoints) * 100)

  return (
    <View style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <Text style={S.headerTitle}>我的</Text>
      </View>

      <View style={{ padding: 16 }}>
        {/* Identity */}
        <SolidCard variant="default" style={S.identityCard}>
          <View style={S.avatar}>
            <Text style={S.avatarEmoji}>😺</Text>
          </View>
          <Text style={S.displayName}>{user.displayName}</Text>
          <Text style={S.userId}>指路人#{user.id}</Text>
          <Text style={S.levelHint}>L{user.trustLevel} · 加入3天</Text>
        </SolidCard>

        {/* Stats */}
        <View style={S.statsRow}>
          <SolidCard variant="default" style={S.statCard}>
            <View style={[S.statIcon, { backgroundColor: COLORS.primarySoft }]}>
              <Text style={S.statIconText}>🧭</Text>
            </View>
            <Text style={S.statLabel}>方向值</Text>
            <Text style={S.statValue}>{user.directionPoints}</Text>
            <Text style={S.statHint}>距 L{user.trustLevel + 1} 还差 {levelGap}</Text>
            <View style={S.progressBar}>
              <View style={[S.progressFill, { width: `${levelProgress}%` as any }]} />
            </View>
          </SolidCard>

          <SolidCard variant="default" style={S.statCard}>
            <View style={[S.statIcon, { backgroundColor: COLORS.riskSoft }]}>
              <Text style={S.statIconText}>🔥</Text>
            </View>
            <Text style={S.statLabel}>{PRODUCT.streakName}</Text>
            <Text style={S.statValue}>{user.streakDays} 天</Text>
            <Text style={S.statHint}>再看1条即可保持</Text>
          </SolidCard>

          <SolidCard variant="default" style={S.statCard}>
            <View style={[S.statIcon, { backgroundColor: COLORS.dark }]}>
              <Text style={[S.statIconText, { color: "#FFF" }]}>🏆</Text>
            </View>
            <Text style={S.statLabel}>{PRODUCT.levelName}</Text>
            <Text style={S.statValue}>L{user.trustLevel}</Text>
            <Text style={S.statHint}>已帮助{user.helpedCount}人</Text>
          </SolidCard>
        </View>

        {/* Badges */}
        <SolidCard variant="default" style={S.badgeCard}>
          <Text style={S.sectionTitle}>{PRODUCT.badgeName}</Text>
          <View style={S.badgeRow}>
            {user.badges.map((b) => (
              <View key={b} style={S.badge}>
                <Text style={S.badgeText}>{b}</Text>
              </View>
            ))}
          </View>
        </SolidCard>

        {/* Daily tasks */}
        <SolidCard variant="default" style={S.taskCard}>
          <Text style={S.sectionTitle}>今日指路任务</Text>
          {dailyTasks.map((t) => (
            <View key={t.id} style={[S.taskRow, t.completed && S.taskDone]}>
              <View style={{ flex: 1 }}>
                <Text style={[S.taskTitle, t.completed && { color: COLORS.primaryForeground }]}>
                  {t.completed ? "✅ " : ""}{t.title}
                </Text>
                <Text style={S.taskMeta}>+{t.rewardPoints} 方向值 · {t.progress}/{t.target}</Text>
              </View>
              {!t.completed && <SolidButton title="去完成" variant="secondary" size="sm" />}
            </View>
          ))}
        </SolidCard>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, paddingTop: 56, backgroundColor: COLORS.dark },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFF" },

  identityCard: { padding: 24, alignItems: "center", marginBottom: 16 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primarySoft, justifyContent: "center", alignItems: "center",
    marginBottom: 12, ...SHADOWS.iconContainer,
  },
  avatarEmoji: { fontSize: 32 },
  displayName: { fontSize: 18, fontWeight: "700", color: COLORS.ink },
  userId: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  levelHint: { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, padding: 14, alignItems: "center" },
  statIcon: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  statIconText: { fontSize: 16 },
  statLabel: { fontSize: 11, color: COLORS.muted },
  statValue: { fontSize: 20, fontWeight: "800", color: COLORS.ink, marginTop: 4 },
  statHint: { fontSize: 10, color: COLORS.mutedLight, marginTop: 2, marginBottom: 6 },
  progressBar: {
    width: "100%", height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, overflow: "hidden",
  },
  progressFill: {
    height: "100%", backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  badgeCard: { padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.ink, marginBottom: 12 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    backgroundColor: COLORS.surfaceHover, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  badgeText: { fontSize: 12, color: COLORS.textSecondary },

  taskCard: { padding: 16 },
  taskRow: {
    flexDirection: "row", alignItems: "center",
    padding: 12, borderRadius: RADIUS["2xl"],
    backgroundColor: COLORS.surfaceMuted, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  taskDone: { backgroundColor: COLORS.primarySoft, borderColor: "transparent" },
  taskTitle: { fontSize: 14, fontWeight: "600", color: COLORS.ink },
  taskMeta: { fontSize: 11, color: COLORS.mutedLight, marginTop: 2 },
})

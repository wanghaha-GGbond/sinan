import { ScrollView, StyleSheet, Text, View } from "react-native"
import { router } from "expo-router"
import { COLORS, RADIUS } from "../theme"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { SolidTopbar } from "../components/SinanPrimitives"

const currentUser = {
  displayName: "指路人",
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

export default function MeScreen() {
  const levelGap = currentUser.nextLevelPoints - currentUser.directionPoints
  const levelProgress = Math.round((currentUser.directionPoints / currentUser.nextLevelPoints) * 100)

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content}>
      <SolidTopbar
        title="我的"
        subtitle={`${currentUser.displayName} · 指路等级 L${currentUser.trustLevel}`}
        right={
          <View style={S.userPill}>
            <Text style={S.userPillText}>指路人#{currentUser.id.slice(0, 6)} ›</Text>
          </View>
        }
      />

      <View style={S.statsGrid}>
        <SolidCard variant="default" style={S.statCard}>
          <View style={[S.iconBox, { backgroundColor: COLORS.primarySoft }]}>
            <Text style={[S.iconText, { color: COLORS.primaryForeground }]}>N</Text>
          </View>
          <Text style={S.statLabel}>方向值</Text>
          <Text style={S.statValue}>{currentUser.directionPoints}</Text>
          <Text style={S.statHint}>距离 L{currentUser.trustLevel + 1} 还差 {levelGap}</Text>
          <View style={S.progressTrack}>
            <View style={[S.progressFill, { width: `${levelProgress}%` }]} />
          </View>
        </SolidCard>

        <SolidCard variant="default" style={S.statCard}>
          <View style={[S.iconBox, { backgroundColor: COLORS.riskSoft }]}>
            <Text style={[S.iconText, { color: COLORS.riskForeground }]}>L</Text>
          </View>
          <Text style={S.statLabel}>连续点灯</Text>
          <Text style={S.statValue}>{currentUser.streakDays} 天</Text>
          <Text style={S.statHint}>今天再看 1 条评价即可保持</Text>
        </SolidCard>

        <SolidCard variant="default" style={S.statCard}>
          <View style={[S.iconBox, { backgroundColor: COLORS.dark }]}>
            <Text style={[S.iconText, { color: "#FFFFFF" }]}>L{currentUser.trustLevel}</Text>
          </View>
          <Text style={S.statLabel}>指路等级</Text>
          <Text style={S.statValue}>L{currentUser.trustLevel}</Text>
          <Text style={S.statHint}>已帮助 {currentUser.helpedCount} 位后来者</Text>
        </SolidCard>
      </View>

      <SolidCard variant="default" style={S.sectionCard}>
        <Text style={S.sectionTitle}>今日指路任务</Text>
        <View style={S.taskList}>
          {dailyTasks.map((task) => (
            <View key={task.id} style={[S.taskRow, task.completed && S.taskDone]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[S.taskTitle, task.completed && { color: COLORS.primaryForeground }]}>
                  {task.completed ? "已完成 · " : ""}{task.title}
                </Text>
                <Text style={S.taskMeta}>
                  奖励 +{task.rewardPoints} 方向值 · 进度 {task.progress}/{task.target}
                </Text>
              </View>
              {!task.completed ? (
                <SolidButton
                  title="去完成"
                  variant="secondary"
                  size="sm"
                  onPress={() => task.id === "3" ? router.push("/submit") : router.push("/")}
                />
              ) : null}
            </View>
          ))}
        </View>
      </SolidCard>

      <SolidCard variant="default" style={S.sectionCard}>
        <Text style={S.sectionTitle}>司南徽章</Text>
        <View style={S.badgeRow}>
          {currentUser.badges.map((badge) => (
            <View key={badge} style={S.badge}>
              <Text style={S.badgeText}>{badge}</Text>
            </View>
          ))}
        </View>
      </SolidCard>
    </ScrollView>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 96 },
  userPill: {
    borderRadius: 999,
    backgroundColor: COLORS.surfaceHover,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  userPillText: { fontSize: 11, fontWeight: "700", color: COLORS.muted },
  statsGrid: { gap: 12, padding: 16 },
  statCard: { padding: 18 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconText: { fontSize: 13, fontWeight: "900" },
  statLabel: { fontSize: 13, fontWeight: "700", color: COLORS.muted },
  statValue: { fontSize: 30, fontWeight: "900", color: COLORS.ink, marginTop: 6 },
  statHint: { fontSize: 12, color: COLORS.mutedLight, marginTop: 5 },
  progressTrack: { height: 7, borderRadius: 999, backgroundColor: COLORS.surfaceHover, overflow: "hidden", marginTop: 12 },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: COLORS.primary },
  sectionCard: { padding: 18, marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: COLORS.ink, marginBottom: 14 },
  taskList: { gap: 10 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: RADIUS["2xl"],
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 14,
  },
  taskDone: { backgroundColor: COLORS.primarySoft, borderColor: "transparent" },
  taskTitle: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  taskMeta: { fontSize: 12, color: COLORS.mutedLight, marginTop: 4 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceHover,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: COLORS.textSecondary },
})

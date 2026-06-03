import { useEffect, useMemo, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { Link, router } from "expo-router"
import { Award, Bookmark, Flame, Lock, Navigation, Star } from "lucide-react-native"

import { COLORS, RADIUS } from "../theme"
import { getFavoritedCompanyIdsAsync } from "../lib/storage"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { SolidTopbar, TagPill } from "../components/SinanPrimitives"
import {
  badgeCatalog,
  companies,
  currentUser,
  dailyTasks,
  myFavoriteCompanies,
  myReviews,
} from "../data"

export default function MeScreen() {
  const levelGap = currentUser.nextLevelPoints - currentUser.directionPoints
  const levelProgress = Math.round(
    (currentUser.directionPoints / currentUser.nextLevelPoints) * 100
  )

  const [hydrated, setHydrated] = useState(false)
  const [extraFavoriteIds, setExtraFavoriteIds] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    getFavoritedCompanyIdsAsync().then((ids) => {
      if (!cancelled) {
        setExtraFavoriteIds(ids)
        setHydrated(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const myReviewsList = useMemo(() => myReviews(), [])

  const favoriteSet = useMemo(
    () => new Set([...myFavoriteCompanies.map((c) => c.companyId), ...extraFavoriteIds]),
    [extraFavoriteIds]
  )

  const myFavoriteList = useMemo(() => {
    const seed = myFavoriteCompanies
    const extra: Array<{ companyId: string; companyName: string; createdAt: string }> = []
    for (const id of extraFavoriteIds) {
      if (seed.some((c) => c.companyId === id)) continue
      const company = companies.find((c) => c.id === id)
      if (!company) continue
      extra.push({
        companyId: id,
        companyName: company.shortName,
        createdAt: new Date().toISOString(),
      })
    }
    return [...seed, ...extra]
  }, [extraFavoriteIds])

  return (
    <View style={S.container}>
      <SolidTopbar title="司南 我的" subtitle="方向值与连续点灯" back />
      <ScrollView contentContainerStyle={S.content}>
        {/* Header */}
        <View style={S.header}>
          <View style={{ flex: 1 }}>
            <Text style={S.headerTitle}>我的</Text>
            <Text style={S.headerSub}>
              {currentUser.displayName} · 指路等级 L{currentUser.trustLevel}
            </Text>
          </View>
        </View>

        {/* Stats cards */}
        <View style={S.statsRow}>
          <StatCard
            iconBg={COLORS.primarySoft}
            iconColor={COLORS.primaryForeground}
            icon={<Navigation size={16} color={COLORS.primaryForeground} />}
            label="方向值"
            value={`${currentUser.directionPoints}`}
            sub={`距离 L${currentUser.trustLevel + 1} 还差 ${levelGap}`}
            progress={levelProgress}
          />
          <StatCard
            iconBg={COLORS.riskSoft}
            iconColor={COLORS.riskForeground}
            icon={<Flame size={16} color={COLORS.riskForeground} />}
            label="连续点灯"
            value={`${currentUser.streakDays} 天`}
            sub="今天再看 1 条评价即可保持"
          />
          <StatCard
            iconBg={COLORS.dark}
            iconColor="#FFFFFF"
            icon={<Award size={16} color="#FFFFFF" />}
            label="指路等级"
            value={`L${currentUser.trustLevel}`}
            sub={`已帮助 ${currentUser.helpedCount} 位后来者`}
          />
        </View>

        {/* Daily tasks */}
        <Section title="今日指路任务">
          <View style={S.taskList} testID="me-daily-tasks">
            {dailyTasks.map((task) => {
              const progressPct = Math.round((task.progress / task.target) * 100)
              return (
                <View
                  key={task.id}
                  style={[
                    S.taskRow,
                    task.completed ? S.taskRowDone : S.taskRowTodo,
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        S.taskTitle,
                        task.completed ? S.taskTitleDone : null,
                      ]}
                    >
                      {task.completed ? "✅ " : ""}
                      {task.title}
                    </Text>
                    <Text style={S.taskMeta}>
                      奖励 +{task.rewardPoints} 方向值 · 进度 {task.progress}/{task.target}
                      {task.hint ? ` · ${task.hint}` : ""}
                    </Text>
                    {!task.completed ? (
                      <View style={S.progressBar}>
                        <View
                          style={[S.progressFill, { width: `${progressPct}%` }]}
                        />
                      </View>
                    ) : null}
                  </View>
                  {!task.completed && task.href ? (
                    <TouchableOpacity
                      onPress={() => router.push(task.href as never)}
                      activeOpacity={0.85}
                      style={S.taskCta}
                    >
                      <Text style={S.taskCtaText}>去完成</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )
            })}
          </View>
        </Section>

        {/* My reviews */}
        <Section
          title="我的评价"
          right={
            <Link href="/submit" asChild>
              <TouchableOpacity>
                <Text style={S.sectionAction}>写新评价 →</Text>
              </TouchableOpacity>
            </Link>
          }
        >
          {myReviewsList.length === 0 ? (
            <EmptyHint
              text="还没有评价"
              hint="分享你熟悉的那家公司,帮助更多后来者看清方向。"
              cta="写第一条评价"
              href="/submit"
            />
          ) : (
            <View style={S.list} testID="me-my-reviews">
              {myReviewsList.map((review) => (
                <Link
                  key={review.id}
                  href={`/company/${review.companyId}/reviews/${review.id}`}
                  asChild
                >
                  <TouchableOpacity activeOpacity={0.92} style={S.listItem}>
                    <View style={S.listItemHead}>
                      <Text style={S.listItemTitle} numberOfLines={1}>
                        {review.companyName}
                      </Text>
                      <View style={S.listItemMeta}>
                        <Star size={12} color={COLORS.primary} fill={COLORS.primary} />
                        <Text style={S.listItemMetaText}>
                          {review.directionScore} 分 · {review.employmentStatus}
                        </Text>
                      </View>
                    </View>
                    <Text style={S.listItemBody} numberOfLines={2}>
                      {review.shortComment}
                    </Text>
                    <Text style={S.listItemFoot}>
                      有用 {review.usefulCount} · 追问 {review.discussionCount}
                    </Text>
                  </TouchableOpacity>
                </Link>
              ))}
            </View>
          )}
        </Section>

        {/* My favorites */}
        <Section
          title="我的收藏"
          right={
            <Text style={S.sectionMeta} testID="me-favorites-count">
              共 {favoriteSet.size} 家公司
            </Text>
          }
        >
          {myFavoriteList.length === 0 && hydrated ? (
            <EmptyHint
              text="还没有收藏公司"
              hint="在任意公司详情页点 ☆,这里会汇总你关注的公司方向变化。"
              cta="去发现公司"
              href="/search"
            />
          ) : (
            <View style={S.favGrid} testID="me-my-favorites">
              {myFavoriteList.map((fav) => {
                const company = companies.find((c) => c.id === fav.companyId)
                return (
                  <Link key={fav.companyId} href={`/company/${fav.companyId}`} asChild>
                    <TouchableOpacity activeOpacity={0.92} style={S.favItem}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={S.favTitle} numberOfLines={1}>
                          {fav.companyName}
                        </Text>
                        <Text style={S.favMeta} numberOfLines={1}>
                          {company ? `${company.industry} · ${company.city}` : "已收藏公司"}
                        </Text>
                      </View>
                      <Bookmark size={16} color={COLORS.primary} fill={COLORS.primary} />
                    </TouchableOpacity>
                  </Link>
                )
              })}
            </View>
          )}
        </Section>

        {/* Badges with progress */}
        <Section
          title="司南徽章"
          right={
            <Text style={S.sectionMeta} testID="me-badges-progress">
              {badgeCatalog.filter((b) => b.unlocked).length} / {badgeCatalog.length} 已解锁
            </Text>
          }
        >
          <View style={S.badgeList} testID="me-badges-list">
            {badgeCatalog.map((badge) => {
              const progress = badge.progress ?? badge.target ?? 0
              const target = badge.target ?? 0
              const ratio = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : badge.unlocked ? 100 : 0
              return (
                <View
                  key={badge.id}
                  style={[
                    S.badgeRow,
                    badge.unlocked ? S.badgeRowDone : S.badgeRowTodo,
                  ]}
                >
                  <View style={S.badgeLeft}>
                    <View
                      style={[
                        S.badgeIcon,
                        badge.unlocked ? S.badgeIconDone : S.badgeIconTodo,
                      ]}
                    >
                      {badge.unlocked ? (
                        <Award size={16} color="#FFFFFF" />
                      ) : (
                        <Lock size={16} color={COLORS.muted} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          S.badgeName,
                          badge.unlocked ? S.badgeNameDone : null,
                        ]}
                      >
                        {badge.name}
                      </Text>
                      <Text style={S.badgeDesc}>{badge.description}</Text>
                    </View>
                  </View>
                  {!badge.unlocked && target > 0 ? (
                    <View style={S.badgeProgress}>
                      <Text style={S.badgeProgressText}>
                        {progress} / {target}
                      </Text>
                      <View style={S.progressBar}>
                        <View style={[S.progressFill, { width: `${ratio}%` }]} />
                      </View>
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>
          <View style={S.badgeTagRow}>
            {currentUser.badges.map((badge) => (
              <TagPill key={badge} tone="positive">
                {badge}
              </TagPill>
            ))}
          </View>
        </Section>
      </ScrollView>
    </View>
  )
}

function Section({
  title,
  right,
  children,
}: {
  title: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <View style={S.section}>
      <View style={S.sectionHead}>
        <Text style={S.sectionTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  )
}

function StatCard({
  iconBg,
  iconColor,
  icon,
  label,
  value,
  sub,
  progress,
}: {
  iconBg: string
  iconColor: string
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  progress?: number
}) {
  return (
    <SolidCard variant="subtle" style={S.statCard}>
      <View style={S.statHead}>
        <View style={[S.statIcon, { backgroundColor: iconBg }]}>
          {icon}
        </View>
        <Text style={S.statLabel}>{label}</Text>
      </View>
      <Text style={S.statValue}>{value}</Text>
      <Text style={S.statSub}>{sub}</Text>
      {typeof progress === "number" ? (
        <View style={S.progressBar}>
          <View style={[S.progressFill, { width: `${progress}%`, backgroundColor: iconColor }]} />
        </View>
      ) : null}
    </SolidCard>
  )
}

function EmptyHint({
  text,
  hint,
  cta,
  href,
}: {
  text: string
  hint: string
  cta: string
  href: string
}) {
  return (
    <View style={S.empty}>
      <Text style={S.emptyTitle}>{text}</Text>
      <Text style={S.emptyHint}>{hint}</Text>
      <Link href={href as never} asChild>
        <TouchableOpacity activeOpacity={0.9} style={S.emptyCta}>
          <Text style={S.emptyCtaText}>{cta}</Text>
        </TouchableOpacity>
      </Link>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: COLORS.ink },
  headerSub: { marginTop: 4, fontSize: 13, color: COLORS.muted },
  statsRow: { gap: 12 },
  statCard: { padding: 18 },
  statHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: { fontSize: 13, fontWeight: "600", color: COLORS.muted },
  statValue: { marginTop: 8, fontSize: 28, fontWeight: "800", color: COLORS.ink },
  statSub: { marginTop: 4, fontSize: 12, color: COLORS.mutedLight },
  section: { gap: 12 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  sectionAction: { fontSize: 13, fontWeight: "800", color: COLORS.primaryDark },
  sectionMeta: { fontSize: 12, color: COLORS.muted },
  taskList: { gap: 10 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: RADIUS.lg,
    padding: 14,
  },
  taskRowDone: { backgroundColor: COLORS.primarySoft },
  taskRowTodo: {
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: `${COLORS.border}99`,
  },
  taskTitle: { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  taskTitleDone: { color: COLORS.primaryForeground },
  taskMeta: { marginTop: 4, fontSize: 12, color: COLORS.muted },
  taskCta: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.ink,
  },
  taskCtaText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  list: { gap: 10 },
  listItem: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.border}99`,
    backgroundColor: COLORS.surfaceMuted,
    padding: 14,
  },
  listItemHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  listItemTitle: { fontSize: 14, fontWeight: "800", color: COLORS.ink, flex: 1 },
  listItemMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  listItemMetaText: { fontSize: 12, color: COLORS.muted },
  listItemBody: { marginTop: 6, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  listItemFoot: { marginTop: 6, fontSize: 11, color: COLORS.mutedLight },
  favGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  favItem: {
    flex: 1,
    minWidth: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${COLORS.border}99`,
    backgroundColor: COLORS.surfaceMuted,
  },
  favTitle: { fontSize: 13, fontWeight: "800", color: COLORS.ink },
  favMeta: { marginTop: 2, fontSize: 11, color: COLORS.muted },
  badgeList: { gap: 8 },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: RADIUS.md,
  },
  badgeRowDone: { backgroundColor: COLORS.primarySoft },
  badgeRowTodo: {
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: `${COLORS.border}99`,
  },
  badgeLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIconDone: { backgroundColor: COLORS.primary },
  badgeIconTodo: { backgroundColor: COLORS.border },
  badgeName: { fontSize: 13, fontWeight: "700", color: COLORS.ink },
  badgeNameDone: { color: COLORS.primaryForeground },
  badgeDesc: { marginTop: 2, fontSize: 11, color: COLORS.muted },
  badgeProgress: { alignItems: "flex-end", minWidth: 80 },
  badgeProgressText: { fontSize: 11, color: COLORS.muted, marginBottom: 4 },
  badgeTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.border}80`,
  },
  progressBar: {
    marginTop: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surfaceHover,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2, backgroundColor: COLORS.primary },
  empty: {
    padding: 18,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: `${COLORS.border}99`,
    gap: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: "800", color: COLORS.ink },
  emptyHint: { fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  emptyCta: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  emptyCtaText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
})

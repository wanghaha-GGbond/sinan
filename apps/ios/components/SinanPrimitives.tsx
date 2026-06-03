import { ReactNode } from "react"
import { View, Text, StyleSheet, TouchableOpacity, type ViewStyle } from "react-native"
import { router } from "expo-router"
import { COLORS, RADIUS, SHADOWS } from "../theme"

export function ScoreChip({ score, compact }: { score: number | string; compact?: boolean }) {
  return (
    <View style={[S.scoreChip, compact && S.scoreChipCompact]}>
      <Text style={[S.scoreText, compact && S.scoreTextCompact]}>{score}</Text>
    </View>
  )
}

export function MetricPill({ label, value, style }: { label: string; value: string | number; style?: ViewStyle }) {
  return (
    <View style={[S.metricPill, style]}>
      <Text style={S.metricLabel}>{label}</Text>
      <Text style={S.metricValue}>{value}</Text>
    </View>
  )
}

export function TagPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "match" | "neutral" | "risk" | "positive" }) {
  return (
    <View style={[S.tag, tagStyles[tone]]}>
      <Text style={[S.tagText, tagTextStyles[tone]]}>{children}</Text>
    </View>
  )
}

export function SolidTopbar({
  title,
  subtitle,
  right,
  back,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
  back?: boolean
}) {
  return (
    <View style={S.topbar}>
      <View style={S.topbarInner}>
        {back ? (
          <TouchableOpacity onPress={() => router.back()} style={S.backButton}>
            <Text style={S.backText}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={S.brandMark}>
            <Text style={S.brandText}>司</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={S.topbarTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={S.topbarSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={S.rightSlot}>{right}</View> : null}
      </View>
    </View>
  )
}

const tagStyles = StyleSheet.create({
  match: { backgroundColor: COLORS.primarySoft },
  neutral: { backgroundColor: COLORS.surfaceHover },
  risk: { backgroundColor: COLORS.riskSoft },
  positive: { backgroundColor: COLORS.primarySoft },
})

const tagTextStyles = StyleSheet.create({
  match: { color: COLORS.primaryForeground },
  neutral: { color: COLORS.inkSoft },
  risk: { color: COLORS.riskForeground },
  positive: { color: COLORS.primaryForeground },
})

const S = StyleSheet.create({
  scoreChip: {
    minWidth: 54, height: 42, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primarySoft, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#BDEDDD",
  },
  scoreChipCompact: { minWidth: 46, height: 34, borderRadius: RADIUS.md },
  scoreText: { fontSize: 18, fontWeight: "900", color: COLORS.primary },
  scoreTextCompact: { fontSize: 15 },
  metricPill: {
    flex: 1, minHeight: 62, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceHover, paddingHorizontal: 12, paddingVertical: 10,
    justifyContent: "center",
  },
  metricLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 4 },
  metricValue: { fontSize: 14, fontWeight: "800", color: COLORS.inkSoft },
  tag: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: "flex-start",
  },
  tagText: { fontSize: 11, fontWeight: "700" },
  topbar: {
    backgroundColor: "rgba(247,248,242,0.96)",
    borderBottomWidth: 1,
    borderColor: "rgba(229,231,219,0.7)",
    ...SHADOWS.hero,
  },
  topbarInner: {
    minHeight: 58, paddingTop: 8, paddingHorizontal: 16, paddingBottom: 8,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  brandMark: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center", ...SHADOWS.iconContainer,
  },
  brandText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  backButton: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surfaceHover,
    alignItems: "center", justifyContent: "center",
  },
  backText: { color: COLORS.ink, fontSize: 28, fontWeight: "500", marginTop: -2 },
  topbarTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  topbarSubtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  rightSlot: { flexShrink: 0 },
})

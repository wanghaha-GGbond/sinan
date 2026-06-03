import { View, Text, StyleSheet } from "react-native"
import { Link } from "expo-router"
import { Compass, Home, Search } from "lucide-react-native"

import { COLORS, RADIUS } from "../theme"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { SolidTopbar } from "../components/SinanPrimitives"

export default function NotFoundScreen() {
  return (
    <View style={S.container}>
      <SolidTopbar title="司南" subtitle="404" />
      <View style={S.body}>
        <SolidCard variant="elevated" style={S.card}>
          <View style={S.iconWrap}>
            <Compass size={32} color={COLORS.mutedLight} />
          </View>
          <Text style={S.eyebrow}>404</Text>
          <Text style={S.title}>这条路还没画在司南上</Text>
          <Text style={S.description}>
            你访问的页面可能已下架、被合并,或者从未存在过。回到主页,或者直接搜一家公司。
          </Text>
          <View style={S.actions}>
            <Link href="/" asChild>
              <View style={S.primaryBtn}>
                <Home size={14} color="#FFFFFF" />
                <Text style={S.primaryText}>回到推荐流</Text>
              </View>
            </Link>
            <Link href="/search" asChild>
              <View style={S.secondaryBtn}>
                <Search size={14} color={COLORS.inkSoft} />
                <Text style={S.secondaryText}>搜索公司</Text>
              </View>
            </Link>
          </View>
        </SolidCard>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 460,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceHover,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4, color: COLORS.mutedLight },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.ink, textAlign: "center" },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.muted,
    textAlign: "center",
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap", justifyContent: "center" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  primaryText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceHover,
  },
  secondaryText: { fontSize: 14, fontWeight: "800", color: COLORS.inkSoft },
})

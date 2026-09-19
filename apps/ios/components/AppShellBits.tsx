import { useCallback, useState } from "react"
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { router, useFocusEffect, usePathname } from "expo-router"
import { COLORS, RADIUS, SHADOWS } from "../theme"
import { SolidButton } from "./SolidButton"
import { getSession, type SessionUser } from "../lib/api"

const intelLinks = [
  { href: "/search", label: "公司" },
  { href: "/research", label: "研报" },
]

export function IntelNav() {
  const pathname = usePathname() ?? ""

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.intelNav}>
      {intelLinks.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <TouchableOpacity
            key={item.href}
            activeOpacity={0.76}
            onPress={() => router.push(item.href as never)}
            style={[S.intelItem, active && S.intelItemActive]}
          >
            <Text style={[S.intelText, active && S.intelTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

export function AppFooter() {
  return (
    <View style={S.footer}>
      <Text style={S.footerText}>在场：入职前，先看清方向。</Text>
      <Text style={S.footerText}>匿名保护优先，不向公司开放用户身份。</Text>
      <TouchableOpacity onPress={() => router.push("/support")} accessibilityRole="link">
        <Text style={S.footerLink}>帮助与内容安全</Text>
      </TouchableOpacity>
    </View>
  )
}

export function HomeHeaderActions() {
  const [user, setUser] = useState<SessionUser | null>(null)

  useFocusEffect(
    useCallback(() => {
      let active = true
      getSession()
        .then((session) => { if (active) setUser(session) })
        .catch(() => { if (active) setUser(null) })
      return () => { active = false }
    }, []),
  )

  return (
    <View style={S.actions}>
      {!user ? <SolidButton title="登录" variant="secondary" size="sm" onPress={() => router.push("/login")} style={S.actionButton} /> : <SolidButton title="我的" variant="ghost" size="sm" onPress={() => router.push("/me")} style={S.actionButton} />}
      <SolidButton title="写评价" variant="primary" size="sm" onPress={() => router.push("/submit")} style={S.actionButton} />
    </View>
  )
}

const S = StyleSheet.create({
  intelNav: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  intelItem: {
    borderRadius: 999,
    backgroundColor: COLORS.surfaceHover,
    paddingHorizontal: 13,
    paddingVertical: 8,
    ...SHADOWS.buttonSecondary,
  },
  intelItemActive: {
    backgroundColor: COLORS.dark,
    shadowColor: "rgba(17,24,39,0.22)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  intelText: { fontSize: 13, fontWeight: "800", color: COLORS.textSecondary },
  intelTextActive: { color: "#FFFFFF" },
  footer: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 6,
  },
  footerText: { fontSize: 13, color: COLORS.muted },
  footerLink: { fontSize: 13, fontWeight: "800", color: COLORS.primaryDark },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" },
  actionButton: { minWidth: 0, paddingHorizontal: 10, borderRadius: RADIUS.lg },
})

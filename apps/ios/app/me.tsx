import { useEffect, useState } from "react"
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native"
import { Link, router } from "expo-router"

import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { SolidInput } from "../components/SolidInput"
import { SolidTopbar } from "../components/SinanPrimitives"
import {
  deleteAccount,
  getSession,
  getWebUrl,
  logout,
  type SessionUser,
} from "../lib/api"
import { COLORS } from "../theme"

export default function MeScreen() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    getSession()
      .then((session) => { if (active) setUser(session) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function signOut() {
    await logout()
    setUser(null)
    router.replace("/login")
  }

  async function removeAccount() {
    setDeleting(true)
    setError("")
    try {
      await deleteAccount()
      setUser(null)
      router.replace("/")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "账号注销失败")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <View style={S.container}>
      <SolidTopbar title="司南 我的" subtitle="账号、隐私与数据" />
      <ScrollView contentContainerStyle={S.content}>
        {loading ? <Text style={S.muted}>正在读取安全会话…</Text> : !user ? (
          <SolidCard variant="elevated" style={S.card}>
            <Text style={S.title}>登录司南</Text>
            <Text style={S.body}>登录后可提交匿名评价并管理账号数据。</Text>
            <View style={S.actions}><Link href="/login" asChild><SolidButton title="登录" /></Link><Link href="/register" asChild><SolidButton title="邀请码注册" variant="secondary" /></Link></View>
          </SolidCard>
        ) : (
          <>
            <SolidCard variant="elevated" style={S.card}>
              <Text style={S.eyebrow}>当前账号</Text>
              <Text style={S.title}>{user.displayName || "匿名指路人"}</Text>
              <Text style={S.body}>身份等级 L{user.trustLevel ?? 0} · {user.role}</Text>
              <View style={S.actions}><Link href="/submit" asChild><SolidButton title="写匿名评价" /></Link><SolidButton title="退出登录" variant="secondary" onPress={() => void signOut()} /></View>
            </SolidCard>

            <SolidCard variant="subtle" style={S.card}>
              <Text style={S.title}>账号与数据</Text>
              <Text style={S.body}>注销会立即清除邮箱、手机号、密码、头像、工作邮箱、匿名画像、私聊和个人功能内容。已审核公开评价可能保留，但会解除账号与匿名身份关联。</Text>
              <Text style={S.label}>输入 DELETE 确认永久注销</Text>
              <SolidInput value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" placeholder="DELETE" />
              {error ? <Text style={S.error}>{error}</Text> : null}
              <SolidButton title={deleting ? "正在注销…" : "永久注销账号"} variant="dark" disabled={confirmation !== "DELETE" || deleting} onPress={() => void removeAccount()} />
            </SolidCard>
          </>
        )}

        <SolidCard variant="subtle" style={S.card}>
          <Text style={S.title}>法律与隐私</Text>
          <Text style={S.body}>查看完整政策，了解匿名边界、数据用途和内容审核规则。</Text>
          <View style={S.actions}><SolidButton title="隐私政策" variant="ghost" onPress={() => void Linking.openURL(getWebUrl("/legal/privacy"))} /><SolidButton title="用户协议" variant="ghost" onPress={() => void Linking.openURL(getWebUrl("/legal/terms"))} /></View>
        </SolidCard>
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 16, paddingBottom: 90, gap: 16 }, card: { padding: 20, gap: 12 }, eyebrow: { fontSize: 12, fontWeight: "800", color: COLORS.primary }, title: { fontSize: 21, fontWeight: "900", color: COLORS.ink }, body: { fontSize: 13, lineHeight: 21, color: COLORS.textSecondary }, muted: { padding: 24, color: COLORS.muted }, label: { marginTop: 5, fontSize: 12, fontWeight: "800", color: COLORS.inkSoft }, actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, error: { color: COLORS.danger, fontSize: 13, fontWeight: "700" },
})

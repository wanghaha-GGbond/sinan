import { useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { Link, router } from "expo-router"
import { COLORS } from "../theme"
import { SolidButton } from "../components/SolidButton"
import { AppFooter } from "../components/AppShellBits"
import { SolidCard } from "../components/SolidCard"
import { SolidInput } from "../components/SolidInput"

export default function RegisterScreen() {
  const [mode, setMode] = useState<"email" | "phone">("email")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function submit() {
    setError("")
    if (mode === "email" && !email.trim()) {
      setError("请输入邮箱")
      return
    }
    if (mode === "phone" && !phone.trim()) {
      setError("请输入手机号")
      return
    }
    if (password.length < 8) {
      setError("密码至少 8 位字符")
      return
    }
    if (password !== confirmPassword) {
      setError("两次密码输入不一致")
      return
    }
    setSubmitting(true)
    window.setTimeout(() => {
      setSubmitting(false)
      router.replace("/")
    }, 300)
  }

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content}>
      <SolidCard variant="elevated" style={S.card}>
        <View style={S.brand}>
          <View style={S.brandMark}>
            <Text style={S.brandText}>司</Text>
          </View>
          <Text style={S.title}>注册司南</Text>
          <Text style={S.subtitle}>成为指路人，分享真实体验</Text>
        </View>

        <View style={S.segment}>
          <SolidButton title="邮箱" variant={mode === "email" ? "secondary" : "ghost"} onPress={() => setMode("email")} style={S.segmentButton} />
          <SolidButton title="手机" variant={mode === "phone" ? "secondary" : "ghost"} onPress={() => setMode("phone")} style={S.segmentButton} />
        </View>

        <View style={S.form}>
          {mode === "email" ? (
            <Field label="邮箱">
              <SolidInput value={email} onChangeText={setEmail} placeholder="name@company.com" keyboardType="email-address" autoCapitalize="none" />
            </Field>
          ) : (
            <Field label="手机号">
              <SolidInput value={phone} onChangeText={setPhone} placeholder="13800138000" keyboardType="phone-pad" maxLength={11} />
            </Field>
          )}

          <Field label="密码">
            <SolidInput value={password} onChangeText={setPassword} placeholder="至少 8 位字符" secureTextEntry />
          </Field>
          <Field label="确认密码">
            <SolidInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="再次输入密码" secureTextEntry />
          </Field>

          {error ? (
            <View style={S.errorBox}>
              <Text style={S.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={S.privacyBox}>
            <Text style={S.privacyText}>注册即表示同意司南的匿名保护规则。你的身份信息不会向公司方公开。</Text>
          </View>

          <SolidButton title={submitting ? "注册中..." : "注册"} size="lg" disabled={submitting} onPress={submit} />
        </View>

        <View style={S.switchLine}>
          <Text style={S.switchText}>已有账号？</Text>
          <Link href="/login" asChild>
            <SolidButton title="登录" variant="ghost" size="sm" />
          </Link>
        </View>
      </SolidCard>
      <AppFooter />
    </ScrollView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={S.field}>
      <Text style={S.label}>{label}</Text>
      {children}
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { flexGrow: 1, justifyContent: "center", padding: 20, paddingBottom: 96 },
  card: { padding: 28 },
  brand: { alignItems: "center", gap: 8, marginBottom: 26 },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { fontSize: 24, fontWeight: "900", color: COLORS.primaryForeground },
  title: { fontSize: 22, fontWeight: "900", color: COLORS.ink },
  subtitle: { fontSize: 14, color: COLORS.muted },
  segment: { flexDirection: "row", borderRadius: 18, backgroundColor: COLORS.surfaceHover, padding: 4, gap: 4 },
  segmentButton: { flex: 1, shadowOpacity: 0, elevation: 0 },
  form: { gap: 14, marginTop: 18 },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: "800", color: COLORS.textSecondary },
  errorBox: { borderRadius: 14, backgroundColor: COLORS.dangerSoft, padding: 12 },
  errorText: { fontSize: 13, color: COLORS.danger, fontWeight: "700" },
  privacyBox: { borderRadius: 18, backgroundColor: COLORS.surfaceHover, padding: 13 },
  privacyText: { fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  switchLine: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20, gap: 4 },
  switchText: { fontSize: 13, color: COLORS.muted },
})

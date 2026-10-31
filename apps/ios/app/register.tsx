import { useEffect, useState } from "react"
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native"
import { Link, router, useLocalSearchParams } from "expo-router"
import { COLORS } from "../theme"
import { SolidButton } from "../components/SolidButton"
import { AppFooter } from "../components/AppShellBits"
import { SolidCard } from "../components/SolidCard"
import { SolidInput } from "../components/SolidInput"
import { getWebUrl, register, requestRegistrationCode } from "../lib/api"
import { getSafeAppPath } from "../lib/navigation"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ next?: string | string[] }>()
  const nextPath = getSafeAppPath(params.next)
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [notice, setNotice] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function sendCode() {
    setError("")
    setNotice("")
    if (!EMAIL_RE.test(email.trim())) { setError("请输入有效邮箱"); return }
    if (!inviteCode.trim()) { setError("请输入邀请码"); return }
    setSending(true)
    try {
      await requestRegistrationCode(email.trim().toLowerCase(), inviteCode.trim().toUpperCase())
      setCooldown(60)
      setNotice("验证码已发送，请查看邮箱")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "发送失败，请稍后重试")
    } finally { setSending(false) }
  }

  async function submit() {
    setError("")
    if (!EMAIL_RE.test(email.trim())) {
      setError("请输入有效邮箱")
      return
    }
    if (!/^\d{6}$/.test(verificationCode)) {
      setError("请输入 6 位邮箱验证码")
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
    if (!inviteCode.trim()) {
      setError("请输入邀请码")
      return
    }
    setSubmitting(true)
    try {
      await register({
        email: email.trim().toLowerCase(),
        verificationCode,
        password,
        inviteCode: inviteCode.trim().toUpperCase(),
      })
      router.replace(nextPath as never)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "注册失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content}>
      <SolidCard variant="elevated" style={S.card}>
        <View style={S.brand}>
          <View style={S.brandMark}>
            <Text style={S.brandText}>司</Text>
          </View>
          <Text style={S.title}>注册在场</Text>
        </View>

        <View style={S.form}>
          <Field label="邮箱">
            <SolidInput value={email} editable={!sending && !submitting}
              onChangeText={(value) => { setEmail(value); setVerificationCode(""); setNotice("") }}
              placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" />
          </Field>
          <Field label="邮箱验证码">
            <SolidInput value={verificationCode} onChangeText={(value) => setVerificationCode(value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6 位数字" keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} />
            <SolidButton title={sending ? "发送中…" : cooldown ? `${cooldown} 秒后重发` : "获取验证码"}
              variant="secondary" disabled={sending || submitting || cooldown > 0} onPress={() => void sendCode()} />
          </Field>

          <Field label="密码">
            <SolidInput value={password} onChangeText={setPassword} placeholder="至少 8 位字符" secureTextEntry />
          </Field>
          <Field label="确认密码">
            <SolidInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="再次输入密码" secureTextEntry />
          </Field>
          <Field label="邀请码">
            <SolidInput value={inviteCode} onChangeText={setInviteCode} placeholder="8 位邀请码" autoCapitalize="characters" maxLength={8} />
          </Field>

          {error ? (
            <View style={S.errorBox}>
              <Text style={S.errorText}>{error}</Text>
            </View>
          ) : null}
          {notice ? <Text style={S.switchText}>{notice}</Text> : null}

          <View style={S.privacyBox}>
            <Text style={S.privacyText}>
              注册即表示同意
              <Text style={S.privacyLink} onPress={() => void Linking.openURL(getWebUrl("/legal/terms"))}>《用户协议》</Text>
              和
              <Text style={S.privacyLink} onPress={() => void Linking.openURL(getWebUrl("/legal/privacy"))}>《隐私政策》</Text>
              。你的身份信息不会向公司方公开。
            </Text>
          </View>

          <SolidButton title={submitting ? "注册中..." : "注册"} size="lg" disabled={submitting} onPress={() => void submit()} />
        </View>

        <View style={S.switchLine}>
          <Text style={S.switchText}>已有账号？</Text>
          <Link href={{ pathname: "/login", params: { next: nextPath } }} asChild>
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
  privacyLink: { color: COLORS.primary, fontWeight: "800", textDecorationLine: "underline" },
  switchLine: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20, gap: 4 },
  switchText: { fontSize: 13, color: COLORS.muted },
})

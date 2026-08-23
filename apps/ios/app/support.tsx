import { Linking, ScrollView, StyleSheet, Text, View } from "react-native"
import { Link } from "expo-router"

import { AppFooter } from "../components/AppShellBits"
import { SolidButton } from "../components/SolidButton"
import { SolidCard } from "../components/SolidCard"
import { SolidTopbar } from "../components/SinanPrimitives"
import { getWebUrl } from "../lib/api"
import { COLORS } from "../theme"

const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "support@sinanapp.cn"

export default function SupportScreen() {
  return (
    <View style={S.container}>
      <SolidTopbar back title="帮助与内容安全" subtitle="举报、隐私与账号支持" />
      <ScrollView contentContainerStyle={S.content}>
        <SolidCard variant="elevated" style={S.card}>
          <Text style={S.eyebrow}>司南支持中心</Text>
          <Text style={S.title}>遇到问题，直接联系我们</Text>
          <Text style={S.body}>账号、内容、隐私或举报问题，都可以联系支持团队。请不要发送密码或工作凭证原件。</Text>
          <SolidButton title="发送支持邮件" onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} style={S.primary} />
        </SolidCard>

        <SolidCard variant="subtle" style={S.card}>
          <Text style={S.sectionTitle}>举报处理</Text>
          <Text style={S.body}>评价支持举报人身攻击、隐私泄露、造谣、群体对立、批量垃圾内容、竞品刷评和公司控评。一般举报会在24小时内进入人工处理，高风险隐私问题会优先处理。</Text>
          <Text style={S.email}>{SUPPORT_EMAIL}</Text>
        </SolidCard>

        <SolidCard variant="subtle" style={S.card}>
          <Text style={S.sectionTitle}>账号与数据</Text>
          <Text style={S.body}>你可以在“我的 → 账号与数据”中直接注销账号。隐私政策说明账号信息、评价内容和认证凭证的使用、保存与删除方式。</Text>
          <View style={S.actions}>
            <SolidButton title="隐私政策" variant="ghost" onPress={() => void Linking.openURL(getWebUrl("/legal/privacy"))} />
            <SolidButton title="用户协议" variant="ghost" onPress={() => void Linking.openURL(getWebUrl("/legal/terms"))} />
            <Link href="/me" asChild><SolidButton title="账号与数据" variant="secondary" /></Link>
          </View>
        </SolidCard>
        <AppFooter />
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 16, paddingBottom: 96 },
  card: { padding: 20, gap: 12 },
  eyebrow: { fontSize: 12, fontWeight: "800", color: COLORS.primaryDark },
  title: { fontSize: 22, lineHeight: 30, fontWeight: "900", color: COLORS.ink },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: COLORS.ink },
  body: { fontSize: 13, lineHeight: 21, color: COLORS.textSecondary },
  email: { fontSize: 13, fontWeight: "800", color: COLORS.primaryDark },
  primary: { alignSelf: "flex-start", marginTop: 4 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
})

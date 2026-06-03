import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { Link, router } from "expo-router"
import { COLORS } from "../theme"
import { AppFooter, IntelNav } from "./AppShellBits"
import { SolidButton } from "./SolidButton"
import { SolidCard } from "./SolidCard"
import { ScoreChip, SolidTopbar, TagPill } from "./SinanPrimitives"

type InsightItem = {
  id: string
  companyId: string
  title: string
  metric: string
  meta: string
  body: string
  tags?: string[]
  cta?: string
}

export function InsightScreen({
  navTitle,
  navSubtitle,
  heroVariant = "elevated",
  eyebrow,
  heading,
  description,
  action,
  actionHref = "/submit",
  quickTags = [],
  items,
}: {
  navTitle: string
  navSubtitle: string
  heroVariant?: "elevated" | "emerald" | "risk"
  eyebrow: string
  heading: string
  description: string
  action: string
  actionHref?: string
  quickTags?: string[]
  items: InsightItem[]
}) {
  return (
    <View style={S.container}>
      <SolidTopbar back title={navTitle} subtitle={navSubtitle} />
      <IntelNav />

      <ScrollView contentContainerStyle={S.scrollContent}>
        <SolidCard variant={heroVariant} style={S.hero}>
          <View style={S.eyebrow}>
            <Text style={S.eyebrowText}>{eyebrow}</Text>
          </View>
          <Text style={S.heading}>{heading}</Text>
          <Text style={S.description}>{description}</Text>
          <SolidButton
            title={action}
            variant={heroVariant === "risk" ? "dark" : heroVariant === "emerald" ? "dark" : "primary"}
            style={S.heroButton}
            onPress={() => router.push(actionHref as never)}
          />
        </SolidCard>

        {quickTags.length ? (
          <View style={S.quickTags}>
            {quickTags.map((tag) => (
              <TagPill key={tag} tone="neutral">{tag}</TagPill>
            ))}
          </View>
        ) : null}

        <View style={S.grid}>
          {items.map((item) => (
            <Link key={item.id} href={`/company/${item.companyId}`} asChild>
              <TouchableOpacity activeOpacity={0.94}>
                <SolidCard variant="subtle" style={S.card}>
                  <View style={S.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={S.itemTitle}>{item.title}</Text>
                      <Text style={S.meta}>{item.meta}</Text>
                    </View>
                    <ScoreChip score={item.metric} compact />
                  </View>
                  <Text style={S.body}>{item.body}</Text>
                  {item.tags?.length ? (
                    <View style={S.tags}>
                      {item.tags.map((tag) => (
                        <TagPill key={tag} tone={tag.includes("压力") || tag.includes("慢") || tag.includes("波动") ? "risk" : "neutral"}>
                          {tag.startsWith("#") ? tag : `#${tag}`}
                        </TagPill>
                      ))}
                    </View>
                  ) : null}
                  <View style={S.cardFooter}>
                    <SolidButton title={item.cta ?? "公司页"} variant="primary" size="sm" />
                  </View>
                </SolidCard>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
        <AppFooter />
        <View style={{ height: 72 }} />
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 16, gap: 16 },
  hero: { padding: 20 },
  eyebrow: {
    alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#FFFFFF",
    paddingHorizontal: 12, paddingVertical: 6,
  },
  eyebrowText: { fontSize: 12, fontWeight: "800", color: COLORS.primaryForeground },
  heading: { marginTop: 14, fontSize: 26, lineHeight: 32, fontWeight: "800", color: COLORS.ink },
  description: { marginTop: 10, fontSize: 14, lineHeight: 22, color: COLORS.muted },
  heroButton: { marginTop: 16, alignSelf: "flex-start" },
  quickTags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  grid: { gap: 14 },
  card: { padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  itemTitle: { fontSize: 17, fontWeight: "800", color: COLORS.ink },
  meta: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  body: { fontSize: 14, lineHeight: 22, color: COLORS.textSecondary },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  cardFooter: { marginTop: 14, alignSelf: "flex-start" },
})

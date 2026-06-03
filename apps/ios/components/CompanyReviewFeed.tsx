import { useMemo, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { MobileReview } from "../data"
import { COLORS, RADIUS } from "../theme"
import { MobileReviewCard } from "./MobileReviewCard"
import { TagPill } from "./SinanPrimitives"

const tabs = ["全部", "高赞", "最新", "低分", "面试", "薪资"] as const
type FeedTab = (typeof tabs)[number]

function byTab(reviews: MobileReview[], tab: FeedTab) {
  if (tab === "高赞") return [...reviews].sort((a, b) => b.usefulCount - a.usefulCount)
  if (tab === "最新") return [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt, "zh-CN"))
  if (tab === "低分") return reviews.filter((review) => review.directionScore <= 6.5)
  if (tab === "面试") return reviews.filter((review) => review.employmentStatus === "面试者")
  if (tab === "薪资") return reviews.filter((review) => /薪资|调薪|奖金|兑现/.test(review.content + review.title))
  return reviews
}

export function CompanyReviewFeed({ companyId, reviews }: { companyId: string; reviews: MobileReview[] }) {
  const [activeTab, setActiveTab] = useState<FeedTab>("全部")
  const [selectedTag, setSelectedTag] = useState("")

  const tags = useMemo(() => {
    const counter = new Map<string, number>()
    for (const review of reviews) {
      for (const tag of review.tags) counter.set(tag, (counter.get(tag) ?? 0) + 1)
    }
    return Array.from(counter.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [reviews])

  const filteredReviews = useMemo(() => {
    const fromTab = byTab(reviews, activeTab)
    return selectedTag ? fromTab.filter((review) => review.tags.includes(selectedTag)) : fromTab
  }, [activeTab, reviews, selectedTag])

  return (
    <View style={S.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.tabRail}>
        {tabs.map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
            <Text style={[S.tab, activeTab === tab && S.activeTab]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.tagRail}>
        {tags.map(([tag]) => (
          <TouchableOpacity key={tag} onPress={() => setSelectedTag(tag)}>
            <View style={[S.filterTag, selectedTag === tag && S.activeFilterTag]}>
              <Text style={[S.filterTagText, selectedTag === tag && S.activeFilterTagText]}>#{tag}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedTag ? (
        <View style={S.selectedRow}>
          <Text style={S.selectedText}>正在看：#{selectedTag}</Text>
          <TouchableOpacity onPress={() => setSelectedTag("")}>
            <Text style={S.clearText}>清除</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {filteredReviews.length === 0 ? (
        <View style={S.empty}>
          <Text style={S.emptyTitle}>这个分类下还没有评价。</Text>
          <Text style={S.emptyDesc}>成为第一个补上这段经历的人。</Text>
        </View>
      ) : (
        filteredReviews.map((review) => (
          <MobileReviewCard key={review.id} review={review} companyId={companyId} />
        ))
      )}

      <View style={S.hint}>
        <Text style={S.hintText}>{filteredReviews.length > 3 ? "继续下滑，看更多过来人评价" : "已经看完这家公司的当前评价"}</Text>
      </View>
      <TagPill tone="match">匿名评价这家公司</TagPill>
    </View>
  )
}

const S = StyleSheet.create({
  wrap: { gap: 12 },
  tabRail: { gap: 8, borderRadius: 999, backgroundColor: COLORS.surfaceHover, padding: 6 },
  tab: {
    overflow: "hidden", borderRadius: 999, borderWidth: 1, borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surface, paddingHorizontal: 13, paddingVertical: 8,
    fontSize: 12, fontWeight: "800", color: "#475467",
  },
  activeTab: {
    borderColor: COLORS.primary, backgroundColor: COLORS.primary, color: "#FFFFFF",
    shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
  },
  tagRail: { gap: 8, paddingBottom: 2 },
  filterTag: {
    borderRadius: 999, borderWidth: 1, borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 7,
  },
  activeFilterTag: { borderColor: "#BDEDDD", backgroundColor: COLORS.primarySoft },
  filterTagText: { fontSize: 12, fontWeight: "700", color: "#475467" },
  activeFilterTagText: { color: COLORS.primaryForeground },
  selectedRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  selectedText: { fontSize: 13, color: COLORS.muted },
  clearText: { fontSize: 13, fontWeight: "800", color: COLORS.primaryDark },
  empty: { borderRadius: RADIUS["2xl"], backgroundColor: COLORS.surfaceHover, padding: 18 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  emptyDesc: { marginTop: 5, fontSize: 13, color: COLORS.muted },
  hint: { borderRadius: RADIUS["2xl"], backgroundColor: COLORS.surfaceHover, padding: 14 },
  hintText: { fontSize: 13, color: COLORS.muted },
})

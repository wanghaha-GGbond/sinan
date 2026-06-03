import { useState } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Filter, X } from "lucide-react-native"

import { COLORS, RADIUS } from "../theme"

export type SortOption<T extends string> = { value: T; label: string }

export type MobileFilterBarProps<TIndustry extends string, TCity extends string, TSort extends string> = {
  industries: readonly TIndustry[]
  cities: readonly TCity[]
  sortOptions: readonly SortOption<TSort>[]
  industry: TIndustry | "all"
  city: TCity | "all"
  sort: TSort
  resultCount: number
  onChangeIndustry: (value: TIndustry | "all") => void
  onChangeCity: (value: TCity | "all") => void
  onChangeSort: (value: TSort) => void
  onReset?: () => void
  sortLabel?: string
}

/**
 * iOS-side mirror of `apps/web/src/components/common/filter-bar.tsx`. Renders
 * three "chip" buttons that open a bottom sheet (RN `Modal`) to pick an
 * industry / city / sort. RN has no native <select>, so this is the
 * idiomatic equivalent.
 */
export function MobileFilterBar<TIndustry extends string, TCity extends string, TSort extends string>({
  industries,
  cities,
  sortOptions,
  industry,
  city,
  sort,
  resultCount,
  onChangeIndustry,
  onChangeCity,
  onChangeSort,
  onReset,
  sortLabel = "排序",
}: MobileFilterBarProps<TIndustry, TCity, TSort>) {
  const [picker, setPicker] = useState<"industry" | "city" | "sort" | null>(null)
  const hasFilter = industry !== "all" || city !== "all"

  return (
    <View style={S.bar} testID="intelligence-filter-bar">
      <View style={S.headerRow}>
        <View style={S.headerLabel}>
          <Filter size={12} color={COLORS.muted} />
          <Text style={S.headerLabelText}>筛选</Text>
        </View>
        <Text style={S.count}>
          匹配 <Text style={S.countBold}>{resultCount}</Text> 条
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.chipRow}>
        <Chip
          testID="filter-industry"
          label="行业"
          value={industry === "all" ? "全部" : industry}
          onPress={() => setPicker("industry")}
        />
        <Chip
          testID="filter-city"
          label="城市"
          value={city === "all" ? "全部" : city}
          onPress={() => setPicker("city")}
        />
        <Chip
          testID="filter-sort"
          label={sortLabel}
          value={sortOptions.find((o) => o.value === sort)?.label ?? String(sort)}
          onPress={() => setPicker("sort")}
        />
        {hasFilter && onReset ? (
          <TouchableOpacity
            onPress={onReset}
            activeOpacity={0.85}
            style={S.reset}
            testID="filter-reset"
          >
            <X size={12} color={COLORS.muted} />
            <Text style={S.resetText}>重置</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <PickerSheet
        open={picker === "industry"}
        title="选择行业"
        options={[{ value: "all", label: "全部行业" }, ...industries.map((i) => ({ value: i, label: i }))]}
        currentValue={industry}
        onClose={() => setPicker(null)}
        onPick={(value) => onChangeIndustry(value as TIndustry | "all")}
      />
      <PickerSheet
        open={picker === "city"}
        title="选择城市"
        options={[{ value: "all", label: "全部城市" }, ...cities.map((c) => ({ value: c, label: c }))]}
        currentValue={city}
        onClose={() => setPicker(null)}
        onPick={(value) => onChangeCity(value as TCity | "all")}
      />
      <PickerSheet
        open={picker === "sort"}
        title={sortLabel}
        options={sortOptions as readonly { value: string; label: string }[]}
        currentValue={sort}
        onClose={() => setPicker(null)}
        onPick={(value) => onChangeSort(value as TSort)}
      />
    </View>
  )
}

function Chip({
  label,
  value,
  onPress,
  testID,
}: {
  label: string
  value: string
  onPress: () => void
  testID?: string
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={S.chip}
      testID={testID}
    >
      <Text style={S.chipLabel}>{label}</Text>
      <Text style={S.chipValue} numberOfLines={1}>
        {value}
      </Text>
    </TouchableOpacity>
  )
}

function PickerSheet({
  open,
  title,
  options,
  currentValue,
  onClose,
  onPick,
}: {
  open: boolean
  title: string
  options: readonly { value: string; label: string }[]
  currentValue: string
  onClose: () => void
  onPick: (value: string) => void
}) {
  if (!open) return null
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={S.backdrop} onPress={onClose}>
        <Pressable style={S.sheet} onPress={() => undefined}>
          <View style={S.sheetHandle} />
          <View style={S.sheetHeader}>
            <Text style={S.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityLabel="关闭">
              <X size={18} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={S.sheetBody} contentContainerStyle={S.sheetBodyContent}>
            {options.map((option) => {
              const selected = currentValue === option.value
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.85}
                  onPress={() => {
                    onPick(option.value)
                    onClose()
                  }}
                  style={[S.optionRow, selected && S.optionRowSelected]}
                >
                  <View style={[S.optionDot, selected && S.optionDotSelected]} />
                  <Text style={[S.optionLabel, selected && S.optionLabelSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const S = StyleSheet.create({
  bar: {
    borderRadius: RADIUS.lg,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: `${COLORS.border}99`,
    padding: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerLabelText: { fontSize: 12, fontWeight: "800", color: COLORS.muted },
  count: { fontSize: 12, color: COLORS.muted },
  countBold: { fontSize: 13, fontWeight: "800", color: COLORS.ink },
  chipRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceHover,
  },
  chipLabel: { fontSize: 12, color: COLORS.muted, fontWeight: "700" },
  chipValue: { fontSize: 12, color: COLORS.ink, fontWeight: "800", maxWidth: 120 },
  reset: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  resetText: { fontSize: 12, color: COLORS.muted, fontWeight: "700" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.32)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: RADIUS["2xl"],
    borderTopRightRadius: RADIUS["2xl"],
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: "75%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  sheetBody: { flexGrow: 0 },
  sheetBodyContent: { paddingBottom: 12 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
  },
  optionRowSelected: { backgroundColor: COLORS.primarySoft },
  optionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionDotSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  optionLabel: { fontSize: 14, color: COLORS.inkSoft },
  optionLabelSelected: { fontWeight: "800", color: COLORS.primaryForeground },
})

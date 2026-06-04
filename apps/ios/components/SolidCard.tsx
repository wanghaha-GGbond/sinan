import { View, StyleSheet, type ViewStyle } from "react-native"
import { COLORS, RADIUS, SHADOWS } from "../theme"

type CardVariant = "default" | "subtle" | "elevated" | "emerald" | "hero" | "risk"

type Props = {
  children: React.ReactNode
  variant?: CardVariant
  style?: ViewStyle | ViewStyle[]
  testID?: string
}

export function SolidCard({ children, variant = "default", style, testID }: Props) {
  return (
    <View testID={testID} style={[S.base, variantStyles[variant], style]}>
      {children}
    </View>
  )
}

const variantStyles: Record<CardVariant, ViewStyle> = {
  default: {
    ...SHADOWS.card,
  },
  subtle: {
    borderRadius: RADIUS["2xl"],
    ...SHADOWS.cardSubtle,
  },
  elevated: {
    ...SHADOWS.card,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  emerald: {
    backgroundColor: "#F0FFF7",
    borderWidth: 1,
    borderColor: "#BDEDDD",
    shadowColor: "#0E8F5F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  hero: {
    backgroundColor: COLORS.surfaceHover,
    ...SHADOWS.hero,
  },
  risk: {
    backgroundColor: COLORS.riskSoft,
    borderColor: "#FCD9A6",
    shadowColor: COLORS.riskForeground,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
}

const S = StyleSheet.create({
  base: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS["3xl"],
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
})

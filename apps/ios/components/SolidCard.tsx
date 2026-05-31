import { View, StyleSheet, type ViewStyle } from "react-native"
import { COLORS, RADIUS, SHADOWS } from "../theme"

type CardVariant = "default" | "elevated" | "emerald" | "hero"

type Props = {
  children: React.ReactNode
  variant?: CardVariant
  style?: ViewStyle
}

export function SolidCard({ children, variant = "default", style }: Props) {
  return (
    <View style={[S.base, variantStyles[variant], style]}>
      {children}
    </View>
  )
}

const variantStyles: Record<CardVariant, ViewStyle> = {
  default: {
    ...SHADOWS.card,
  },
  elevated: {
    ...SHADOWS.card,
    shadowOpacity: 0.06,
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
}

const S = StyleSheet.create({
  base: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS["3xl"],
    borderWidth: 1,
    borderColor: COLORS.border,
  },
})

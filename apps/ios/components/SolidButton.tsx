import { TouchableOpacity, Text, StyleSheet, type ViewStyle, type TextStyle } from "react-native"
import { COLORS, RADIUS, SHADOWS } from "../theme"

type ButtonVariant = "primary" | "secondary" | "dark" | "ghost" | "risk"
type ButtonSize = "sm" | "md" | "lg"

type Props = {
  title: string
  onPress?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

export function SolidButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  style,
  textStyle,
}: Props) {
  const isPrimary = variant === "primary"

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      activeOpacity={0.7}
      style={[
        S.base,
        S[size],
        variantStyles[variant],
        disabled && S.disabled,
        style,
      ]}
    >
      <Text
        style={[
          S.text,
          S[`text_${size}` as keyof typeof S] as TextStyle,
          { color: textColors[variant] },
          disabled && { opacity: 0.5 },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  )
}

const textColors: Record<ButtonVariant, string> = {
  primary: "#FFFFFF",
  secondary: COLORS.ink,
  dark: "#FFFFFF",
  ghost: COLORS.muted,
  risk: COLORS.riskForeground,
}

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.buttonPrimary,
  },
  secondary: {
    backgroundColor: COLORS.surfaceHover,
    ...SHADOWS.buttonSecondary,
  },
  dark: {
    backgroundColor: COLORS.dark,
    shadowColor: "rgba(17,24,39,0.22)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  ghost: {
    backgroundColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },
  risk: {
    backgroundColor: COLORS.riskSoft,
    shadowColor: COLORS.riskForeground,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    elevation: 3,
  },
}

const S = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 4,
  },
  sm: { height: 36, paddingHorizontal: 12 },
  md: { height: 40, paddingHorizontal: 16 },
  lg: { height: 48, paddingHorizontal: 20 },
  text: {
    fontWeight: "700",
  },
  text_sm: { fontSize: 13 },
  text_md: { fontSize: 14 },
  text_lg: { fontSize: 16 },
  disabled: {
    opacity: 0.5,
  },
})

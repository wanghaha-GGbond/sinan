import { TextInput, StyleSheet, type TextInputProps, type ViewStyle } from "react-native"
import { COLORS, RADIUS } from "../theme"

type Props = TextInputProps & {
  containerStyle?: ViewStyle
}

export function SolidInput({ containerStyle, style, ...props }: Props) {
  return (
    <TextInput
      placeholderTextColor={COLORS.mutedLight}
      style={[S.input, style]}
      {...props}
    />
  )
}

const S = StyleSheet.create({
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.ink,
  },
})

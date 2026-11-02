import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, fonts, radius } from "../theme";
import { Icon } from "./Icon";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  small,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: ViewStyle;
}) {
  const v = VARIANTS[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        s.base,
        small && s.small,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && !off && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        off && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <View style={s.row}>
          {icon ? <Icon n={icon} size={small ? 15 : 17} color={v.fg} /> : null}
          <Text style={[s.text, small && s.textSmall, { color: v.fg }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.ink, fg: colors.white, border: colors.ink },
  accent: { bg: colors.accent, fg: colors.white, border: colors.accent },
  secondary: { bg: colors.surface, fg: colors.ink, border: colors.line },
  ghost: { bg: "transparent", fg: colors.ink2, border: "transparent" },
  danger: { bg: colors.surface, fg: colors.bad, border: colors.line },
};

const s = StyleSheet.create({
  base: { minHeight: 46, borderRadius: radius.btn, borderWidth: 1, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  small: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { fontFamily: fonts.semibold, fontSize: 15, letterSpacing: -0.1 },
  textSmall: { fontSize: 13.5 },
});

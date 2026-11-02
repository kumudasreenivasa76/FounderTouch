import { Pressable, StyleSheet } from "react-native";
import { colors, radius } from "../theme";
import { Icon } from "./Icon";

export function IconButton({ icon, label, onPress, size = 36, color = colors.ink2 }: { icon: string; label: string; onPress: () => void; size?: number; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [s.btn, { width: size, height: size }, pressed && { backgroundColor: colors.sunken }]}
    >
      <Icon n={icon} size={17} color={color} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
});

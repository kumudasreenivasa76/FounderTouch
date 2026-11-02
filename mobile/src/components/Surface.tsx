import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radius, shadows } from "../theme";
import { Txt } from "./Txt";

/** White panel with a hairline border, the basic container (web `.card`). */
export function Surface({ children, style, padded = true }: { children: ReactNode; style?: ViewStyle | ViewStyle[]; padded?: boolean }) {
  return <View style={[s.box, padded && { padding: 16 }, shadows.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={s.section}>
      <Txt v="overline">{children}</Txt>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.md, marginBottom: 12 },
  section: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 8, paddingHorizontal: 2 },
});

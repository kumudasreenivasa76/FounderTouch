import { StyleSheet, View } from "react-native";
import { colors, radius } from "../theme";
import { Icon } from "./Icon";
import { Txt } from "./Txt";

export function Banner({ text, tone = "neutral", icon = "alert" }: { text: string; tone?: "neutral" | "bad" | "warn" | "good"; icon?: string }) {
  const c = {
    neutral: { bg: colors.surface, fg: colors.ink2, border: colors.line },
    bad: { bg: colors.badSoft, fg: colors.bad, border: colors.badSoft },
    warn: { bg: colors.warnSoft, fg: colors.warn, border: colors.warnSoft },
    good: { bg: colors.goodSoft, fg: colors.good, border: colors.goodSoft },
  }[tone];
  return (
    <View style={[s.box, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Icon n={icon} size={16} color={c.fg} />
      <Txt style={[s.text, { color: c.fg }]}>{text}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: radius.sm, borderWidth: 1, marginBottom: 12 },
  text: { flex: 1, fontSize: 13.5, lineHeight: 19 },
});

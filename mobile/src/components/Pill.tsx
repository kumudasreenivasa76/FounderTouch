import { StyleSheet, View } from "react-native";
import { colors, fonts } from "../theme";
import { Txt } from "./Txt";

export type Tone = "neutral" | "good" | "warn" | "bad" | "accent" | "ink";

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.sunken, fg: colors.ink2 },
  good: { bg: colors.goodSoft, fg: colors.good },
  warn: { bg: colors.warnSoft, fg: colors.warn },
  bad: { bg: colors.badSoft, fg: colors.bad },
  accent: { bg: colors.accentSoft, fg: colors.accent },
  ink: { bg: colors.ink, fg: colors.white },
};

export function Pill({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={[s.pill, { backgroundColor: t.bg }]}>
      <Txt style={[s.text, { color: t.fg }]} numberOfLines={1}>{label}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, alignSelf: "flex-start" },
  text: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.1 },
});

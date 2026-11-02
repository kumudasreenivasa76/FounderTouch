import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { colors, fonts, radius, shadows } from "../theme";
import { Txt } from "./Txt";

export function Segmented<K extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { key: K; label: string; count?: number }[];
  value: K;
  onChange: (k: K) => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[s.track, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.key)} style={[s.seg, on && s.on, on && shadows.card]}>
            <Txt style={[s.label, { color: on ? colors.ink : colors.ink3 }]} numberOfLines={1}>
              {o.label}
              {o.count ? <Txt style={[s.count, { color: on ? colors.ink2 : colors.ink3 }]}>{"  " + o.count}</Txt> : null}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  track: { flexDirection: "row", backgroundColor: colors.sunken, borderRadius: radius.sm + 2, padding: 3, marginBottom: 14 },
  seg: { flex: 1, minHeight: 34, borderRadius: radius.sm - 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  on: { backgroundColor: colors.surface },
  label: { fontFamily: fonts.semibold, fontSize: 13.5 },
  count: { fontFamily: fonts.medium, fontSize: 12.5 },
});

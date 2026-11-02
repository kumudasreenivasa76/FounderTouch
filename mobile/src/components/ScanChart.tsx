import { StyleSheet, View } from "react-native";
import { colors, fonts } from "../theme";
import { lastSevenDayLabels } from "../format";
import { Txt } from "./Txt";

/** Seven thin bars, oldest day first, today in ink. */
export function ScanChart({ days }: { days: number[] }) {
  const max = Math.max(1, ...days);
  const labels = lastSevenDayLabels();
  return (
    <View style={s.row}>
      {days.map((d, i) => {
        const today = i === days.length - 1;
        return (
          <View key={i} style={s.col}>
            <Txt style={s.value}>{d || ""}</Txt>
            <View style={s.track}>
              <View style={[s.bar, { height: `${Math.max(4, (d / max) * 100)}%`, backgroundColor: d ? (today ? colors.ink : colors.ink3) : colors.line }]} />
            </View>
            <Txt style={[s.label, today && { color: colors.ink }]}>{labels[i]}</Txt>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, height: 108, alignItems: "flex-end" },
  col: { flex: 1, alignItems: "center", height: "100%" },
  value: { fontFamily: fonts.semibold, fontSize: 11, color: colors.ink3, height: 16 },
  track: { flex: 1, width: "100%", maxWidth: 26, justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 5 },
  label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.ink3, marginTop: 6 },
});

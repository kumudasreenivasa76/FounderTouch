import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors } from "../theme";
import { Icon } from "./Icon";
import { Txt } from "./Txt";

export function ListRow({
  left,
  title,
  subtitle,
  meta,
  right,
  onPress,
  chevron,
  last,
}: {
  left?: ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
}) {
  const body = (
    <View style={[s.row, !last && s.border]}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="bodyMedium" numberOfLines={1}>{title}</Txt>
        {subtitle ? <Txt v="small" numberOfLines={1}>{subtitle}</Txt> : null}
        {meta ? <Txt v="small" style={{ fontSize: 12.5, marginTop: 1 }} numberOfLines={1}>{meta}</Txt> : null}
      </View>
      {right}
      {chevron ? <Icon n="chevron-right" size={18} color={colors.ink3} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { backgroundColor: colors.sunken }}>
      {body}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.line },
});

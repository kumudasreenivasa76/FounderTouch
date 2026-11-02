import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius } from "../theme";
import { Icon } from "./Icon";
import { Txt } from "./Txt";

export function Empty({ icon = "dot", title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={s.wrap}>
      <View style={s.badge}>
        <Icon n={icon} size={20} color={colors.ink3} />
      </View>
      <Txt v="heading" style={{ textAlign: "center" }}>{title}</Txt>
      {text ? <Txt v="small" style={{ textAlign: "center", marginTop: 4, maxWidth: 280 }}>{text}</Txt> : null}
      {action ? <View style={{ marginTop: 14, alignSelf: "stretch" }}>{action}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 20, borderWidth: 1, borderStyle: "dashed", borderColor: colors.lineStrong, borderRadius: radius.md, marginBottom: 12 },
  badge: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.sunken, alignItems: "center", justifyContent: "center", marginBottom: 10 },
});

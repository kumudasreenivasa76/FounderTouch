import { Image, StyleSheet, View } from "react-native";
import { colors, fonts } from "../theme";
import { initials } from "../format";
import { Txt } from "./Txt";

export function Avatar({ name, photoUrl, size = 40, tint }: { name: string; photoUrl?: string | null; size?: number; tint?: string }) {
  const r = { width: size, height: size, borderRadius: size / 2 };
  if (photoUrl) return <Image source={{ uri: photoUrl }} style={[r, { backgroundColor: colors.sunken }]} />;
  return (
    <View style={[r, s.wrap, tint ? { backgroundColor: tint } : null]}>
      <Txt style={{ fontFamily: fonts.semibold, fontSize: size * 0.36, color: tint ? colors.white : colors.ink2, letterSpacing: 0.2 }}>{initials(name)}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: colors.sunken, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.line },
});

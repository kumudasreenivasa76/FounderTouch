import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, shadows } from "../theme";
import { Icon } from "./Icon";
import { Txt } from "./Txt";

/** Bottom sheet built on Modal, works the same on iOS, Android and web. */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.root}>
        <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Close" />
        <View style={[s.sheet, shadows.float, { paddingBottom: 16 + insets.bottom }]}>
          <View style={s.grabber} />
          {title ? (
            <View style={s.head}>
              <Txt v="heading" style={{ flex: 1 }}>{title}</Txt>
              <Pressable onPress={onClose} hitSlop={10} style={s.close} accessibilityLabel="Close">
                <Icon n="x" size={18} color={colors.ink2} />
              </Pressable>
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

export type SheetOption = { label: string; icon?: string; selected?: boolean; destructive?: boolean; onPress: () => void };

/** Action-sheet style list of choices (used instead of Alert, which caps Android at 3 buttons). */
export function OptionSheet({ visible, onClose, title, options }: { visible: boolean; onClose: () => void; title?: string; options: SheetOption[] }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={s.list}>
        {options.map((o, i) => (
          <Pressable
            key={o.label}
            onPress={() => {
              onClose();
              o.onPress();
            }}
            style={({ pressed }) => [s.opt, i < options.length - 1 && s.optBorder, pressed && { backgroundColor: colors.sunken }]}
          >
            {o.icon ? <Icon n={o.icon} size={18} color={o.destructive ? colors.bad : colors.ink2} /> : null}
            <Txt style={[s.optText, o.destructive && { color: colors.bad }]}>{o.label}</Txt>
            {o.selected ? <Icon n="check" size={18} color={colors.ink} /> : null}
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(16,18,22,0.38)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: 16, paddingTop: 8, maxWidth: 640, width: "100%", alignSelf: "center" },
  grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, marginBottom: 10 },
  head: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.sunken, alignItems: "center", justifyContent: "center" },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  opt: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, minHeight: 50 },
  optBorder: { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.line },
  optText: { flex: 1, fontFamily: fonts.medium, fontSize: 15.5, color: colors.ink },
});

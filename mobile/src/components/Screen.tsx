import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, space } from "../theme";
import { Txt } from "./Txt";

/** Standard page: safe area, light background, optional large title and pull to refresh. */
export function Screen({
  title,
  subtitle,
  right,
  children,
  scroll = true,
  refreshing,
  onRefresh,
  edges = ["top"],
  contentStyle,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  contentStyle?: ViewStyle;
}) {
  const header = title ? (
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <Txt v="display">{title}</Txt>
        {subtitle ? <Txt v="small" style={{ marginTop: 2 }}>{subtitle}</Txt> : null}
      </View>
      {right}
    </View>
  ) : null;

  return (
    <SafeAreaView style={s.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[s.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          // Keep the focused field above the keyboard (iOS); Android resizes the window itself.
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.ink3} /> : undefined}
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[s.content, { flex: 1 }, contentStyle]}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, paddingBottom: 32, paddingTop: space.sm },
  header: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginBottom: space.lg, marginTop: space.sm },
});

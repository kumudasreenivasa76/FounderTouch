import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, space } from "../theme";
import { Txt } from "./Txt";

/** Shared frame for login / sign up / set-up: brand mark, title, then the form. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.brand}>
            <View style={s.mark}>
              <View style={s.markCard} />
            </View>
            <Txt style={s.brandText}>FounderTouch</Txt>
          </View>
          <Txt v="display" style={{ marginBottom: 4 }}>{title}</Txt>
          {subtitle ? <Txt v="small" style={{ marginBottom: space.xl, fontSize: 14.5 }}>{subtitle}</Txt> : <View style={{ height: space.xl }} />}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: space.xl, paddingTop: 36, maxWidth: 480, width: "100%", alignSelf: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 36 },
  mark: { width: 32, height: 32, borderRadius: 9, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  markCard: { width: 18, height: 12, borderRadius: 3, backgroundColor: colors.accent },
  brandText: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: -0.3, color: colors.ink },
});

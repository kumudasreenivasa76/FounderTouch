import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { api, errorMessage, type CheckinResult } from "@/api";
import { Button, Field, Icon, QrScanner, Sheet, Txt } from "@/components";
import { clockTime } from "@/format";
import { colors, fonts, radius } from "@/theme";

type Shown = (CheckinResult & { key: number }) | { status: "error"; message: string; key: number };

const LOOK = {
  ok: { bg: colors.good, icon: "check-circle", title: "Checked in" },
  already: { bg: colors.warn, icon: "alert", title: "Already checked in" },
  unknown: { bg: colors.bad, icon: "x-circle", title: "Ticket not recognised" },
  error: { bg: "#3a3e45", icon: "alert", title: "Could not check in" },
} as const;

/** Door mode: stays on the camera, shows each result for a moment, then is ready for the next ticket. */
export default function CheckinScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const focused = useIsFocused();
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<Shown | null>(null);
  const [count, setCount] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");

  const show = (r: Shown) => {
    setShown(r);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(null), r.status === "ok" ? 2200 : 3200);
  };

  const scan = async (code: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.checkin(id, code);
      if (r.status === "ok") {
        setCount((c) => c + 1);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else if (r.status === "already") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
      show({ ...r, key: Date.now() });
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      show({ status: "error", message: errorMessage(e), key: Date.now() });
    } finally {
      // short gap so the same ticket is not read twice while the result appears
      setTimeout(() => setBusy(false), 900);
    }
  };

  const look = shown ? LOOK[shown.status] : null;
  // Full-screen modals can report zero insets, so fall back to the device's real ones.
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0), paddingBottom: Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0) };

  return (
    <View style={[s.root, pad]}>
      <View style={s.top}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.close} accessibilityLabel="Close check in">
          <Icon n="x" size={20} color={colors.white} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt style={s.title} numberOfLines={1}>{name ?? "Check in"}</Txt>
          <Txt style={s.sub}>{count ? `${count} checked in this session` : "Scan each ticket QR at the door"}</Txt>
        </View>
        <Pressable onPress={() => setTyping(true)} hitSlop={8} style={s.type} accessibilityLabel="Type a ticket code">
          <Txt style={s.typeText}>Type code</Txt>
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <QrScanner onScan={scan} paused={busy || typing} active={focused} dark style={{ flex: 1 }} repeatMs={4000} />
      </View>

      <View style={s.bottom}>
        {shown && look ? (
          <Pressable key={shown.key} onPress={() => setShown(null)} style={[s.result, { backgroundColor: look.bg }]}>
            <Icon n={look.icon} size={28} color={colors.white} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Txt style={s.resultTitle}>{look.title}</Txt>
              {shown.status === "error" ? (
                <Txt style={s.resultSub}>{shown.message}</Txt>
              ) : shown.status === "unknown" ? (
                <Txt style={s.resultSub}>This ticket is not for this event.</Txt>
              ) : (
                <Txt style={s.resultSub} numberOfLines={2}>
                  {[shown.name, shown.company].filter(Boolean).join(" · ")}
                  {shown.status === "already" && shown.at ? ` · at ${clockTime(shown.at)}` : ""}
                </Txt>
              )}
            </View>
          </Pressable>
        ) : (
          <View style={[s.result, s.idle]}>
            <Icon n="ticket" size={22} color="rgba(255,255,255,0.7)" />
            <Txt style={[s.resultSub, { color: "rgba(255,255,255,0.75)" }]}>{busy ? "Checking ticket..." : "Ready for the next ticket"}</Txt>
          </View>
        )}
      </View>
      <Sheet visible={typing} onClose={() => setTyping(false)} title="Enter ticket code">
        <Field label="Ticket code or link" value={typed} onChangeText={setTyped} autoCapitalize="none" autoCorrect={false} autoFocus returnKeyType="go" onSubmitEditing={() => submitTyped()} />
        <Button title="Check in" onPress={() => submitTyped()} disabled={!typed.trim()} />
      </Sheet>
    </View>
  );

  function submitTyped() {
    const code = typed.trim();
    if (!code) return;
    setTyping(false);
    setTyped("");
    void scan(code);
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  top: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white, letterSpacing: -0.2 },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: "rgba(255,255,255,0.65)" },
  bottom: { padding: 16 },
  type: { paddingHorizontal: 12, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  typeText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.white },
  result: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 84, borderRadius: radius.lg, paddingHorizontal: 18, paddingVertical: 14 },
  idle: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  resultTitle: { fontFamily: fonts.bold, fontSize: 19, color: colors.white, letterSpacing: -0.3 },
  resultSub: { fontFamily: fonts.medium, fontSize: 14, color: "rgba(255,255,255,0.9)", marginTop: 2 },
});

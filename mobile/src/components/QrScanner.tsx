import { useRef } from "react";
import { Linking, Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { colors, radius } from "../theme";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Txt } from "./Txt";

/**
 * Camera QR scanner with all permission states handled.
 * `paused` stops reporting codes (the preview keeps running) so a result can be shown.
 * The same code is ignored for `repeatMs` so one ticket held in frame is not reported twice.
 */
export function QrScanner({
  onScan,
  paused,
  active = true,
  style,
  dark,
  repeatMs = 2500,
}: {
  onScan: (code: string) => void;
  paused?: boolean;
  active?: boolean;
  style?: ViewStyle;
  dark?: boolean;
  repeatMs?: number;
}) {
  const [perm, request] = useCameraPermissions();
  const last = useRef<{ code: string; at: number } | null>(null);

  const fg = dark ? colors.white : colors.ink;
  const sub = dark ? "rgba(255,255,255,0.7)" : colors.ink3;

  if (!perm) {
    return <View style={[s.box, dark && s.dark, style]} />;
  }

  if (!perm.granted) {
    const blocked = !perm.canAskAgain;
    return (
      <View style={[s.box, s.center, dark && s.dark, style]}>
        <View style={[s.badge, dark && { backgroundColor: "rgba(255,255,255,0.1)" }]}>
          <Icon n="camera" size={22} color={fg} />
        </View>
        <Txt v="heading" style={{ color: fg, textAlign: "center" }}>{blocked ? "Camera access is off" : "Allow the camera to scan"}</Txt>
        <Txt v="small" style={{ color: sub, textAlign: "center", marginTop: 4, marginBottom: 16, maxWidth: 260 }}>
          {blocked ? "Turn on camera access for FounderTouch in Settings to scan QR codes." : "FounderTouch only uses the camera while you are scanning a QR code."}
        </Txt>
        {blocked && Platform.OS !== "web" ? (
          <Button title="Open Settings" variant={dark ? "secondary" : "primary"} small onPress={() => Linking.openSettings()} />
        ) : (
          <Button title="Allow camera" variant={dark ? "secondary" : "primary"} small onPress={request} />
        )}
      </View>
    );
  }

  return (
    <View style={[s.box, s.live, style]}>
      {active ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={
            paused
              ? undefined
              : ({ data }) => {
                  const now = Date.now();
                  if (last.current && last.current.code === data && now - last.current.at < repeatMs) return;
                  last.current = { code: data, at: now };
                  onScan(data);
                }
          }
        />
      ) : null}
      <View pointerEvents="none" style={s.overlay}>
        <View style={s.frame}>
          <View style={[s.corner, s.tl]} />
          <View style={[s.corner, s.tr]} />
          <View style={[s.corner, s.bl]} />
          <View style={[s.corner, s.br]} />
        </View>
      </View>
    </View>
  );
}

const C = 26;
const s = StyleSheet.create({
  box: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, minHeight: 280 },
  dark: { backgroundColor: "#202327", borderColor: "#2b2f34" },
  live: { backgroundColor: "#0d0e10", borderColor: "#0d0e10" },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  badge: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.sunken, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  frame: { width: "62%", aspectRatio: 1 },
  corner: { position: "absolute", width: C, height: C, borderColor: "rgba(255,255,255,0.92)" },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
});

import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { api, type ModeKey } from "@/api";
import { copy, openPage, shareLink } from "@/actions";
import { useAuth } from "@/auth";
import { Banner, BusinessCard, Button, Empty, Icon, Pill, ScanChart, Screen, SectionTitle, Surface, Txt } from "@/components";
import { greeting, plural } from "@/format";
import { useLoad } from "@/useLoad";
import { colors, fonts, radius } from "@/theme";

export default function ShareScreen() {
  const { me, refreshMe } = useAuth();
  const { data: card, error, loading, refreshing, refresh } = useLoad(() => api.card());
  const [mode, setMode] = useState<ModeKey | null>(null);
  const [copied, setCopied] = useState(false);

  const enabled = useMemo(() => (card?.modes ?? []).filter((m) => m.enabled), [card]);
  useEffect(() => {
    if (enabled.length && (!mode || !enabled.some((m) => m.mode === mode))) setMode(enabled[0].mode);
  }, [enabled, mode]);
  const current = enabled.find((m) => m.mode === mode) ?? enabled[0];

  const onRefresh = () => {
    void refresh();
    void refreshMe();
  };

  const first = me?.profile?.firstName || me?.profile?.name?.split(" ")[0] || me?.user.name?.split(" ")[0] || "";

  if (loading && !card) {
    return (
      <Screen>
        <View style={{ paddingTop: 120, alignItems: "center" }}>
          <ActivityIndicator color={colors.ink3} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <View style={s.head}>
        <Txt v="display">{first ? `${greeting()}, ${first}` : greeting()}</Txt>
        {card ? (
          <Txt v="small" style={{ marginTop: 3 }}>
            {plural(card.stats.scans, "scan")} · {plural(card.stats.contacts, "contact")} · {plural(card.stats.saved, "saved card")}
          </Txt>
        ) : null}
      </View>

      {me?.notice ? <Banner text={me.notice} /> : null}
      {error && !card ? <Banner tone="bad" text={error} /> : null}

      {card ? (
        <>
          <BusinessCard
            card={{ name: card.name, byline: card.byline, photoUrl: card.photoUrl, theme: card.theme, lines: card.lines, handle: card.handle, modeLabel: current?.label }}
          />
          <Txt v="small" style={{ textAlign: "center", marginTop: 10, fontSize: 12.5 }}>Tap the card to flip it</Txt>

          {enabled.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.modes} style={{ marginHorizontal: -16 }}>
              {enabled.map((m) => {
                const on = m.mode === current?.mode;
                return (
                  <Pressable key={m.mode} onPress={() => setMode(m.mode)} style={[s.mode, on && s.modeOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Icon n={m.icon} size={15} color={on ? colors.white : colors.ink2} />
                    <Txt style={[s.modeText, on && { color: colors.white }]}>{m.label}</Txt>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={{ height: 18 }} />
          )}

          {current ? (
            <Surface style={{ alignItems: "center", paddingVertical: 22 }}>
              {current.qr ? (
                <View style={s.qrFrame}>
                  <Image source={{ uri: current.qr }} style={s.qr} resizeMode="contain" accessibilityLabel={`QR code for your ${current.label} page`} />
                </View>
              ) : (
                <View style={[s.qrFrame, s.qrEmpty]}>
                  <Icon n="lock" size={22} color={colors.ink3} />
                  <Txt v="small" style={{ textAlign: "center", marginTop: 6 }}>No QR for this mode yet</Txt>
                </View>
              )}
              <Txt v="heading" style={{ marginTop: 14 }}>{current.label}</Txt>
              <Txt v="small" style={{ textAlign: "center" }}>{current.blurb}</Txt>
              {current.needsApproval ? (
                <View style={{ marginTop: 8 }}>
                  <Pill label="Needs approval" tone="warn" />
                </View>
              ) : null}
              <View style={s.actions}>
                <Button title="Share" icon="share" onPress={() => shareLink(current.url, `${card.name}, ${current.label}`)} style={{ flex: 1 }} />
                <Button
                  title={copied ? "Copied" : "Copy link"}
                  icon={copied ? "check" : "copy"}
                  variant="secondary"
                  onPress={async () => {
                    await copy(current.url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  }}
                  style={{ flex: 1 }}
                />
              </View>
              <Button title="Open page" icon="external" variant="ghost" small onPress={() => openPage(current.pageUrl)} style={{ marginTop: 6, alignSelf: "center" }} />
            </Surface>
          ) : (
            <Empty icon="layers" title="No modes switched on" text="Turn on a mode in Profile to get a QR code to share." />
          )}

          {current ? (
            <>
              <SectionTitle right={<Txt v="small" style={{ fontSize: 12.5 }}>{plural(current.scans, "scan")} all time</Txt>}>Last 7 days</SectionTitle>
              <Surface>
                <ScanChart days={current.days} />
              </Surface>
            </>
          ) : null}

          <View style={s.stats}>
            <Stat label="Scans" value={card.stats.scans} />
            <Stat label="Taps" value={card.stats.taps} />
            <Stat label="Contacts" value={card.stats.contacts} />
            <Stat label="Saved" value={card.stats.saved} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.stat}>
      <Txt style={s.statValue}>{value}</Txt>
      <Txt v="small" style={{ fontSize: 12 }}>{label}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  head: { marginTop: 8, marginBottom: 18 },
  modes: { gap: 8, paddingHorizontal: 16, paddingVertical: 18 },
  mode: { flexDirection: "row", alignItems: "center", gap: 7, height: 36, paddingHorizontal: 13, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  modeOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  modeText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink2 },
  qrFrame: { width: 224, height: 224, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  qr: { width: "100%", height: "100%" },
  qrEmpty: { alignItems: "center", justifyContent: "center", backgroundColor: colors.sunken },
  actions: { flexDirection: "row", gap: 10, marginTop: 18, alignSelf: "stretch" },
  stats: { flexDirection: "row", gap: 8, marginTop: 4 },
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  statValue: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.4, color: colors.ink },
});

import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useIsFocused } from "expo-router";
import * as Haptics from "expo-haptics";
import { api, errorMessage, type Peek } from "@/api";
import { confirm, openPage } from "@/actions";
import { Avatar, Banner, BusinessCard, Button, Empty, Field, Icon, ListRow, QrScanner, Screen, Segmented, Sheet, Surface, Txt } from "@/components";
import { timeAgo } from "@/format";
import { useLoad } from "@/useLoad";
import { colors, fonts, radius } from "@/theme";

type Tab = "scan" | "wallet";

const PEEK_THEME = { from: "#2b2f36", to: "#15171a" };

export default function ScanScreen() {
  const focused = useIsFocused();
  const [tab, setTab] = useState<Tab>("scan");
  const wallet = useLoad(() => api.wallet());

  const [result, setResult] = useState<Peek | null>(null);
  const [peekError, setPeekError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [manual, setManual] = useState("");

  const sheetOpen = !!result || !!peekError;

  const peek = async (code: string) => {
    if (busy || sheetOpen) return;
    setBusy(true);
    setSaved(false);
    try {
      const r = await api.peek(code.trim());
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setResult(r);
      if (r.kind === "card" && r.saved) setSaved(true);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setPeekError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setResult(null);
    setPeekError(null);
  };

  const save = async () => {
    if (!result || result.kind !== "card") return;
    setSaving(true);
    try {
      await api.saveToWallet(result.handle, result.mode);
      setSaved(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      void wallet.reload();
    } catch (e) {
      setPeekError(errorMessage(e));
      setResult(null);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!(await confirm("Remove card", `Remove ${name} from your wallet?`, "Remove", true))) return;
    const prev = wallet.data;
    wallet.setData(prev ? { cards: prev.cards.filter((c) => c.id !== id) } : prev);
    try {
      await api.removeFromWallet(id);
    } catch (e) {
      wallet.setData(prev);
      setPeekError(errorMessage(e));
    }
  };

  const cards = wallet.data?.cards ?? [];

  return (
    <Screen title="Scan" subtitle="Point at a FounderTouch QR to see whose card it is." refreshing={wallet.refreshing} onRefresh={tab === "wallet" ? wallet.refresh : undefined}>
      <Segmented
        options={[
          { key: "scan", label: "Scanner" },
          { key: "wallet", label: "Wallet", count: cards.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "scan" ? (
        <>
          <QrScanner onScan={peek} paused={busy || sheetOpen} active={focused && tab === "scan"} style={{ aspectRatio: 1 }} />
          <View style={s.hint}>
            <Icon n="scan" size={15} color={colors.ink3} />
            <Txt v="small">{busy ? "Reading code..." : "Hold steady, it scans by itself."}</Txt>
          </View>

          <Surface style={{ marginTop: 6 }}>
            <Field label="Or paste a card link" value={manual} onChangeText={setManual} autoCapitalize="none" autoCorrect={false} placeholder="https://.../s/abc123" returnKeyType="go" onSubmitEditing={() => manual.trim() && peek(manual)} />
            <Button title="Look up" variant="secondary" small onPress={() => manual.trim() && peek(manual)} disabled={!manual.trim()} loading={busy} />
          </Surface>
        </>
      ) : (
        <>
          {wallet.error ? <Banner tone="bad" text={wallet.error} /> : null}
          {cards.length ? (
            <Surface padded={false} style={{ overflow: "hidden" }}>
              {cards.map((c, i) => (
                <ListRow
                  key={c.id}
                  left={<Avatar name={c.name} photoUrl={c.photoUrl} />}
                  title={c.name}
                  subtitle={c.byline}
                  meta={`${c.modeLabel} · saved ${timeAgo(c.at)}`}
                  onPress={() => openPage(c.pageUrl)}
                  last={i === cards.length - 1}
                  right={
                    <Pressable onPress={() => remove(c.id, c.name)} hitSlop={10} style={s.remove} accessibilityLabel={`Remove ${c.name}`}>
                      <Icon n="trash" size={17} color={colors.ink3} />
                    </Pressable>
                  }
                />
              ))}
            </Surface>
          ) : !wallet.loading ? (
            <Empty icon="wallet" title="Your wallet is empty" text="Scan someone's FounderTouch card and save it here to find them later." />
          ) : null}
        </>
      )}

      <Sheet visible={sheetOpen} onClose={close} title={peekError ? "Could not read that" : result?.kind === "card" ? (result.own ? "That is your card" : "Card found") : "Scanned text"}>
        {peekError ? (
          <>
            <Banner tone="bad" text={peekError} />
            <Button title="Scan again" onPress={close} />
          </>
        ) : result?.kind === "card" ? (
          <>
            <BusinessCard flippable={false} card={{ name: result.name, byline: result.byline, photoUrl: result.photoUrl, theme: result.theme ?? PEEK_THEME, modeLabel: result.modeLabel }} />
            <View style={{ height: 16 }} />
            {result.own ? (
              <Txt v="small" style={{ textAlign: "center", marginBottom: 12 }}>This is your own {result.modeLabel} page. Nothing to save.</Txt>
            ) : saved ? (
              <View style={s.saved}>
                <Icon n="check-circle" size={17} color={colors.good} />
                <Txt style={{ color: colors.good, fontFamily: fonts.semibold }}>Saved to your wallet</Txt>
              </View>
            ) : (
              <Button title="Save to wallet" icon="wallet" onPress={save} loading={saving} />
            )}
            <Button title="Open page" icon="external" variant="secondary" onPress={() => openPage(result.pageUrl)} style={{ marginTop: 10 }} />
          </>
        ) : result?.kind === "other" ? (
          <>
            <Surface>
              <Txt selectable>{result.text}</Txt>
            </Surface>
            <Txt v="small" style={{ marginBottom: 12 }}>This QR is not a FounderTouch card.</Txt>
            {/^https?:\/\//i.test(result.text) ? <Button title="Open link" icon="external" variant="secondary" onPress={() => openPage(result.text)} style={{ marginBottom: 10 }} /> : null}
            <Button title="Scan again" onPress={close} />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  hint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginVertical: 14 },
  remove: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  saved: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", minHeight: 46, backgroundColor: colors.goodSoft, borderRadius: radius.btn },
});

import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { api, errorMessage, MODE_OPTIONS, type ModeKey } from "@/api";
import { useAuth } from "@/auth";
import { AuthShell, Banner, Button, Field, Icon, Txt } from "@/components";
import { colors, fonts, radius } from "@/theme";

export default function Setup() {
  const { me, refreshMe, signOut } = useAuth();
  const [f, setF] = useState({
    firstName: me?.user.firstName || me?.user.name.split(" ")[0] || "",
    lastName: me?.user.lastName || me?.user.name.split(" ").slice(1).join(" ") || "",
    headline: "",
    company: "",
  });
  const [modes, setModes] = useState<ModeKey[]>(["FOUNDER"]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (m: ModeKey) => setModes((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));

  const submit = async () => {
    if (!f.firstName.trim() || !f.headline.trim()) {
      setError("Add your name and a headline.");
      return;
    }
    if (!modes.length) {
      setError("Pick at least one mode.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.setupProfile({ firstName: f.firstName.trim(), lastName: f.lastName.trim(), headline: f.headline.trim(), company: f.company.trim() || undefined, modes });
      await refreshMe();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Set up your card" subtitle="The basics now. You can add contact details and links later.">
      {error ? <Banner tone="bad" text={error} /> : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="First name" value={f.firstName} onChangeText={set("firstName")} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Last name" value={f.lastName} onChangeText={set("lastName")} />
        </View>
      </View>
      <Field label="Headline" value={f.headline} onChangeText={set("headline")} placeholder="Founder, Acme Robotics" />
      <Field label="Company (optional)" value={f.company} onChangeText={set("company")} />

      <Txt v="label" style={{ marginTop: 4, marginBottom: 8 }}>How do you want to be met?</Txt>
      <View style={s.grid}>
        {MODE_OPTIONS.map((m) => {
          const on = modes.includes(m.mode);
          return (
            <Pressable key={m.mode} onPress={() => toggle(m.mode)} style={[s.chip, on && s.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <Icon n={m.icon} size={16} color={on ? colors.white : colors.ink2} />
              <Txt style={[s.chipText, on && { color: colors.white }]}>{m.label}</Txt>
            </Pressable>
          );
        })}
      </View>
      <Txt v="small" style={{ marginTop: 8, marginBottom: 18 }}>Each mode gets its own page and QR code. An All page is always included.</Txt>

      <Button title="Create my card" onPress={submit} loading={busy} />
      <Button title="Log out" variant="ghost" onPress={signOut} style={{ marginTop: 8 }} />
    </AuthShell>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, height: 38, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.ink2 },
});

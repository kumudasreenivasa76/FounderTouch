import { useEffect, useState } from "react";
import { Platform, StyleSheet, Switch, View } from "react-native";
import * as Haptics from "expo-haptics";
import { api, API_URL, errorMessage, type CardMode, type Profile, type Socials } from "@/api";
import { confirm, openPage } from "@/actions";
import { useAuth } from "@/auth";
import { Avatar, Banner, Button, Field, Icon, ListRow, Screen, SectionTitle, Surface, Txt } from "@/components";
import { useLoad } from "@/useLoad";
import { colors, fonts } from "@/theme";

type Form = {
  firstName: string;
  lastName: string;
  headline: string;
  company: string;
  bio: string;
  phone: string;
  email: string;
  website: string;
  linkedin: string;
  x: string;
  github: string;
  instagram: string;
};

function toForm(p: Profile): Form {
  const [first, ...rest] = (p.name || "").split(" ");
  return {
    firstName: p.firstName || first || "",
    lastName: p.lastName || rest.join(" "),
    headline: p.headline || "",
    company: p.company || "",
    bio: p.bio || "",
    phone: p.phone || "",
    email: p.email || "",
    website: p.website || "",
    linkedin: p.socials?.linkedin || "",
    x: p.socials?.x || "",
    github: p.socials?.github || "",
    instagram: p.socials?.instagram || "",
  };
}

const WEB_ORIGIN = API_URL.replace(/\/api\/v1$/, "");

export default function ProfileScreen() {
  const { me, refreshMe, signOut } = useAuth();
  const card = useLoad(() => api.card());
  const profile = me?.profile ?? null;

  const [form, setForm] = useState<Form | null>(profile ? toForm(profile) : null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [modes, setModes] = useState<CardMode[]>([]);
  const [modeError, setModeError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && !dirty) setForm(toForm(profile));
  }, [profile, dirty]);

  useEffect(() => {
    if (card.data) setModes(card.data.modes);
  }, [card.data]);

  const set = (k: keyof Form) => (v: string) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setDirty(true);
    setMsg(null);
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setMsg(null);
    try {
      const socials: Socials = { ...(profile?.socials ?? {}), linkedin: form.linkedin.trim(), x: form.x.trim(), github: form.github.trim(), instagram: form.instagram.trim() };
      await api.updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        headline: form.headline.trim(),
        company: form.company.trim(),
        bio: form.bio.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        socials,
      });
      setDirty(false);
      await refreshMe();
      void card.reload();
      setMsg({ tone: "good", text: "Saved. Your card and pages are updated." });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setMsg({ tone: "bad", text: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const patchMode = async (m: CardMode, body: { enabled?: boolean; needsApproval?: boolean }) => {
    const prev = modes;
    setModes((ms) => ms.map((x) => (x.mode === m.mode ? { ...x, ...body } : x)));
    setModeError(null);
    void Haptics.selectionAsync().catch(() => {});
    try {
      await api.updateMode(m.mode, body);
      void card.reload();
    } catch (e) {
      setModes(prev);
      setModeError(errorMessage(e));
    }
  };

  const logout = async () => {
    if (await confirm("Log out", "You will need to log in again to share your card.", "Log out", true)) await signOut();
  };

  return (
    <Screen title="Profile" refreshing={card.refreshing} onRefresh={() => { void card.refresh(); void refreshMe(); }}>
      {profile ? (
        <Surface style={s.who}>
          <Avatar name={profile.name} photoUrl={profile.photoUrl} size={52} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt v="heading" numberOfLines={1}>{profile.name}</Txt>
            <Txt v="small" numberOfLines={1}>{profile.byline}</Txt>
            <Txt v="small" numberOfLines={1} style={{ fontSize: 12.5 }}>{me?.user.email}</Txt>
          </View>
        </Surface>
      ) : null}

      <SectionTitle>Links</SectionTitle>
      <Surface padded={false} style={{ overflow: "hidden" }}>
        {profile ? <ListRow left={<RowIcon n="globe" />} title="View my public page" subtitle={profile.pageUrl.replace(/^https?:\/\//, "")} onPress={() => openPage(profile.pageUrl)} chevron /> : null}
        <ListRow left={<RowIcon n="settings" />} title="Full editor on the web" subtitle="Photo, card colours, deck, jobs and events" onPress={() => openPage(WEB_ORIGIN)} chevron last />
      </Surface>

      {form ? (
        <>
          <SectionTitle>Basics</SectionTitle>
          <Surface>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="First name" value={form.firstName} onChangeText={set("firstName")} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Last name" value={form.lastName} onChangeText={set("lastName")} />
              </View>
            </View>
            <Field label="Headline" value={form.headline} onChangeText={set("headline")} />
            <Field label="Company" value={form.company} onChangeText={set("company")} />
            <Field label="Bio" value={form.bio} onChangeText={set("bio")} multiline maxLength={600} />
          </Surface>

          <SectionTitle>Contact</SectionTitle>
          <Surface>
            <Field label="Phone" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" autoComplete="tel" />
            <Field label="Email on card" value={form.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Website" value={form.website} onChangeText={set("website")} keyboardType="url" autoCapitalize="none" placeholder="https://" />
            <Field label="LinkedIn" value={form.linkedin} onChangeText={set("linkedin")} autoCapitalize="none" placeholder="Profile link or handle" />
            <Field label="X" value={form.x} onChangeText={set("x")} autoCapitalize="none" placeholder="@handle" />
            <Field label="GitHub" value={form.github} onChangeText={set("github")} autoCapitalize="none" />
            <Field label="Instagram" value={form.instagram} onChangeText={set("instagram")} autoCapitalize="none" />
          </Surface>
          {msg ? <Banner tone={msg.tone} icon={msg.tone === "good" ? "check-circle" : "alert"} text={msg.text} /> : null}
          <Button title={dirty ? "Save changes" : "Saved"} onPress={save} loading={saving} disabled={!dirty} style={{ marginBottom: 8 }} />
        </>
      ) : null}

      <SectionTitle>Modes</SectionTitle>
      <Txt v="small" style={{ marginBottom: 10, marginTop: -2, paddingHorizontal: 2 }}>Each mode is its own page and QR. Ask for approval to keep a page private until you say yes.</Txt>
      {modeError ? <Banner tone="bad" text={modeError} /> : null}
      {card.error && !modes.length ? <Banner tone="bad" text={card.error} /> : null}
      <Surface padded={false} style={{ overflow: "hidden" }}>
        {modes.map((m, i) => {
          const locked = m.mode === "ALL";
          return (
            <View key={m.mode} style={[s.mode, i < modes.length - 1 && s.modeBorder]}>
              <View style={s.modeRow}>
                <RowIcon n={m.icon} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt v="bodyMedium">{m.label}</Txt>
                  <Txt v="small" numberOfLines={1}>{locked ? "Always on, shows everything" : m.blurb}</Txt>
                </View>
                <Switch
                  value={m.enabled}
                  disabled={locked}
                  onValueChange={(v) => patchMode(m, { enabled: v })}
                  trackColor={{ false: colors.lineStrong, true: colors.ink }}
                  thumbColor={colors.white}
                  ios_backgroundColor={colors.lineStrong}
                  accessibilityLabel={`${m.label} mode`}
                />
              </View>
              {m.enabled ? (
                <View style={s.approval}>
                  <Icon n="lock" size={14} color={colors.ink3} />
                  <Txt style={s.approvalText}>Needs approval</Txt>
                  <Switch
                    value={m.needsApproval}
                    onValueChange={(v) => patchMode(m, { needsApproval: v })}
                    trackColor={{ false: colors.lineStrong, true: colors.ink }}
                    thumbColor={colors.white}
                    ios_backgroundColor={colors.lineStrong}
                    style={Platform.OS === "ios" ? { transform: [{ scale: 0.8 }] } : undefined}
                    accessibilityLabel={`${m.label} needs approval`}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </Surface>

      <Button title="Log out" icon="logout" variant="danger" onPress={logout} style={{ marginTop: 18 }} />
      <Txt v="small" style={{ textAlign: "center", marginTop: 14, fontSize: 12 }}>FounderTouch for {Platform.OS === "ios" ? "iPhone" : Platform.OS === "android" ? "Android" : "web"} · v1.0.0</Txt>
    </Screen>
  );
}

function RowIcon({ n }: { n: string }) {
  return (
    <View style={s.rowIcon}>
      <Icon n={n} size={17} color={colors.ink2} />
    </View>
  );
}

const s = StyleSheet.create({
  who: { flexDirection: "row", alignItems: "center", gap: 14 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.sunken, alignItems: "center", justifyContent: "center" },
  mode: { paddingHorizontal: 14, paddingVertical: 12 },
  modeBorder: { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.line },
  modeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  approval: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginLeft: 46, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.line },
  approvalText: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.ink2 },
});

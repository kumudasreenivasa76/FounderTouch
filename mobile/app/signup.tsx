import { useState } from "react";
import { View } from "react-native";
import { Link } from "expo-router";
import { api, errorMessage } from "@/api";
import { useAuth } from "@/auth";
import { AuthShell, Banner, Button, Field, Txt } from "@/components";
import { colors, fonts } from "@/theme";

export default function Signup() {
  const { signIn } = useAuth();
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", password: "", invite: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.firstName.trim() || !f.email.trim() || !f.password) {
      setError("Add your first name, email and a password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { token } = await api.signup({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        email: f.email.trim(),
        password: f.password,
        invite: f.invite.trim() || undefined,
      });
      await signIn(token);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your card" subtitle="One card, a page for every side of what you do.">
      {error ? <Banner tone="bad" text={error} /> : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="First name" value={f.firstName} onChangeText={set("firstName")} autoComplete="given-name" textContentType="givenName" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Last name" value={f.lastName} onChangeText={set("lastName")} autoComplete="family-name" textContentType="familyName" />
        </View>
      </View>
      <Field label="Email" value={f.email} onChangeText={set("email")} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" placeholder="you@company.com" />
      <Field label="Password" value={f.password} onChangeText={set("password")} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="At least 8 characters." />
      <Field label="Invite code (optional)" value={f.invite} onChangeText={set("invite")} autoCapitalize="none" autoCorrect={false} hint="Needed if FounderTouch is invite only right now." />
      <Button title="Create account" onPress={submit} loading={busy} style={{ marginTop: 6 }} />
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 22, gap: 6 }}>
        <Txt v="small">Already have an account?</Txt>
        <Link href="/login" replace>
          <Txt v="small" style={{ color: colors.ink, fontFamily: fonts.semibold }}>Log in</Txt>
        </Link>
      </View>
    </AuthShell>
  );
}

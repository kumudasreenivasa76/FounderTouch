import { useRef, useState } from "react";
import { View, type TextInputInstance } from "react-native";
import { Link } from "expo-router";
import { api, errorMessage } from "@/api";
import { useAuth } from "@/auth";
import { AuthShell, Banner, Button, Field, Txt } from "@/components";
import { colors, fonts } from "@/theme";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pw = useRef<TextInputInstance>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { token } = await api.login(email.trim(), password);
      await signIn(token);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to share your card and see who scanned it.">
      {error ? <Banner tone="bad" text={error} /> : null}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => pw.current?.focus()}
        placeholder="you@company.com"
      />
      <Field
        ref={pw}
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button title="Log in" onPress={submit} loading={busy} style={{ marginTop: 6 }} />
      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 22, gap: 6 }}>
        <Txt v="small">New to FounderTouch?</Txt>
        <Link href="/signup" replace>
          <Txt v="small" style={{ color: colors.ink, fontFamily: fonts.semibold }}>Create an account</Txt>
        </Link>
      </View>
    </AuthShell>
  );
}

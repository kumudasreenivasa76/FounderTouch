import { createPrivateKey, sign } from "crypto";

/**
 * Social sign-in (Google, Microsoft, Apple) over plain OAuth 2.0 / OpenID Connect.
 * Each provider needs its keys in .env; an unconfigured provider sends the
 * visitor back to /login with a friendly message instead of breaking.
 *
 *  Google    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *            redirect URI: <origin>/auth/google/callback
 *  Microsoft MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET  (Entra app, "common" tenant)
 *            redirect URI: <origin>/auth/microsoft/callback
 *  Apple     APPLE_CLIENT_ID (Services ID), APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (.p8 contents)
 *            redirect URI: <origin>/auth/apple/callback — Apple requires a real https domain.
 */
export const SSO_PROVIDERS = ["google", "microsoft", "apple"] as const;
export type Provider = (typeof SSO_PROVIDERS)[number];
export const isProvider = (s: string): s is Provider => (SSO_PROVIDERS as readonly string[]).includes(s);

type Cfg = {
  label: string;
  authorize: string;
  token: string;
  scope: string;
  extra: Record<string, string>;
  column: "googleId" | "microsoftId" | "appleId";
  configured: () => boolean;
  clientId: () => string;
  clientSecret: () => string;
};

/** Apple's "client secret" is a short-lived ES256 JWT signed with the .p8 key. */
function appleClientSecret(): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const data = `${b64({ alg: "ES256", kid: process.env.APPLE_KEY_ID })}.${b64({ iss: process.env.APPLE_TEAM_ID, iat: now, exp: now + 600, aud: "https://appleid.apple.com", sub: process.env.APPLE_CLIENT_ID })}`;
  const key = createPrivateKey(String(process.env.APPLE_PRIVATE_KEY).replace(/\\n/g, "\n"));
  const sig = sign("sha256", Buffer.from(data), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${data}.${sig}`;
}

export const SSO: Record<Provider, Cfg> = {
  google: {
    label: "Google",
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    extra: { prompt: "select_account" },
    column: "googleId",
    configured: () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    clientId: () => process.env.GOOGLE_CLIENT_ID!,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET!,
  },
  microsoft: {
    label: "Microsoft",
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email profile",
    extra: { prompt: "select_account" },
    column: "microsoftId",
    configured: () => !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    clientId: () => process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: () => process.env.MICROSOFT_CLIENT_SECRET!,
  },
  apple: {
    label: "Apple",
    authorize: "https://appleid.apple.com/auth/authorize",
    token: "https://appleid.apple.com/auth/token",
    scope: "name email",
    extra: { response_mode: "form_post" }, // Apple posts the code back when scopes are requested
    column: "appleId",
    configured: () => !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY),
    clientId: () => process.env.APPLE_CLIENT_ID!,
    clientSecret: appleClientSecret,
  },
};

export function authUrl(p: Provider, origin: string, state: string) {
  const cfg = SSO[p];
  const q = new URLSearchParams({
    client_id: cfg.clientId(),
    redirect_uri: `${origin}/auth/${p}/callback`,
    response_type: "code",
    scope: cfg.scope,
    state,
    ...cfg.extra,
  });
  return `${cfg.authorize}?${q}`;
}

export type SsoUser = { sub: string; email: string; emailVerified: boolean; name: string; givenName: string; familyName: string };

/** Swaps the callback code for tokens and reads the account out of the id_token (trusted: it comes straight from the provider over TLS). */
export async function userFromCode(p: Provider, origin: string, code: string): Promise<SsoUser | null> {
  const cfg = SSO[p];
  const r = await fetch(cfg.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId(),
      client_secret: cfg.clientSecret(),
      redirect_uri: `${origin}/auth/${p}/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!r.ok) return null;
  const { id_token } = (await r.json()) as { id_token?: string };
  const payload = id_token?.split(".")[1];
  if (!payload) return null;
  try {
    const c = JSON.parse(Buffer.from(payload, "base64url").toString()) as Record<string, unknown>;
    const email = String(c.email ?? c.preferred_username ?? "").toLowerCase();
    if (!c.sub || !email.includes("@")) return null;
    const verified =
      p === "google" ? c.email_verified === true
      : p === "apple" ? c.email_verified === true || c.email_verified === "true"
      : true; // Microsoft work/school and personal accounts are verified by Microsoft
    return {
      sub: String(c.sub),
      email,
      emailVerified: verified,
      name: String(c.name ?? email),
      givenName: String(c.given_name ?? ""),
      familyName: String(c.family_name ?? ""),
    };
  } catch {
    return null;
  }
}

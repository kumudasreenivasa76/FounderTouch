import { createSign } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import { byline, themeOf } from "@/lib/look";

const b64 = (o: object | Buffer) => (Buffer.isBuffer(o) ? o : Buffer.from(JSON.stringify(o))).toString("base64url");
const page = (body: string, status = 200) =>
  new NextResponse(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><body style="font:16px/1.5 system-ui;max-width:520px;margin:32px auto;padding:0 16px">${body}</body>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

/** Adds the owner's card to Google Wallet as a generic pass. Needs the Google Wallet API keys in the environment. */
export async function GET(req: NextRequest) {
  const u = await currentUser();
  if (!u?.profile) return NextResponse.redirect(new URL("/login", req.url));
  const q = req.nextUrl.searchParams.get("mode") ?? "ALL";
  const mode = ((MODES as readonly string[]).includes(q) ? q : "ALL") as Mode;
  const link = await db.shareLink.findFirst({ where: { profileId: u.profile.id, mode } });
  if (!link) return page("<h2>No card for that mode</h2>", 404);

  const issuer = process.env.GOOGLE_WALLET_ISSUER_ID, email = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\n/g, "\n");
  if (!issuer || !email || !key) {
    return page(`<h2>Google Wallet isn't set up yet</h2>
      <p>Adding a card to Google Wallet needs your own Google Wallet API account. It takes about 10 minutes and is free:</p>
      <ol><li>Create an issuer in the <b>Google Pay &amp; Wallet Console</b> and copy the <b>Issuer ID</b>.</li>
      <li>In Google Cloud, enable the <b>Google Wallet API</b> and create a <b>service account</b> and a JSON key.</li>
      <li>In the Wallet Console, add that service account's email as a user of your issuer.</li>
      <li>Set these in <code>.env</code> and restart the app:<pre style="background:#f1f3f8;padding:10px;border-radius:8px;overflow:auto">GOOGLE_WALLET_ISSUER_ID=...
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=...@...iam.gserviceaccount.com
GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"</pre></li></ol>
      <p>Until then, use <b>Card image</b> to save the card to Photos, or Share → Add to Home Screen.</p><p><a href="/app?pane=wallet">← Back</a></p>`, 501);
  }

  const p = u.profile, origin = req.nextUrl.origin, theme = themeOf(p.theme);
  const classId = `${issuer}.foundertouch_card`;
  const text = (header: string, body: string) => ({ header, body });
  const generic = {
    id: `${issuer}.${p.id}_${mode}`, classId, state: "ACTIVE",
    cardTitle: { defaultValue: { language: "en", value: "FounderTouch" } },
    header: { defaultValue: { language: "en", value: p.name } },
    subheader: { defaultValue: { language: "en", value: byline(p.headline, p.company) || MODE_INFO[mode].label } },
    hexBackgroundColor: theme.from,
    barcode: { type: "QR_CODE", value: `${origin}/s/${link.token}?src=qr`, alternateText: p.handle },
    textModulesData: [p.phone && text("Phone", p.phone), p.email && text("Email", p.email), p.website && text("Website", p.website)].filter(Boolean),
    linksModuleData: { uris: [{ uri: `${origin}/${p.handle}?mode=${mode}`, description: "Open my page" }] },
  };
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: "RS256", typ: "JWT" });
  const body = b64({ iss: email, aud: "google", typ: "savetowallet", iat: now, origins: [origin], payload: { genericClasses: [{ id: classId }], genericObjects: [generic] } });
  const sig = createSign("RSA-SHA256").update(`${head}.${body}`).sign(key);
  return NextResponse.redirect(`https://pay.google.com/gp/v/save/${head}.${body}.${b64(sig)}`);
}

import { headers } from "next/headers";
import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { membership } from "@/lib/org";
import { buildSignature, buildBanner } from "@/lib/signature";
import EmailSignature from "@/components/email-signature";

/** Email signature studio: a live preview that copies as rich text into Gmail or Outlook. */
export default async function Signature() {
  const { user, profile } = await requireOwner();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const team = await membership(user.id);
  const link = await db.shareLink.findFirst({ where: { profileId: profile.id, mode: "ALL" } });
  const url = link ? `${origin}/s/${link.token}` : `${origin}/${profile.handle}`;
  const sig = buildSignature(profile, url, buildBanner(team?.org, profile.theme));

  return (
    <>
      <div className="dash-top">
        <div>
          <h2>Email signature</h2>
          <div className="dash-sub">Your card at the bottom of every email you send.</div>
        </div>
      </div>

      <div className="panels">
        <div className="panel">
          <h3>Preview</h3>
          <EmailSignature html={sig} />
        </div>
        <div className="panel">
          <h3>How to set it</h3>
          <ol className="howto">
            <li><b>Copy signature</b> on the left — it copies with its formatting.</li>
            <li><b>Gmail</b>: Settings → See all settings → General → Signature → paste.</li>
            <li><b>Outlook</b>: Settings → Mail → Compose and reply → paste.</li>
            <li><b>Apple Mail</b>: Settings → Signatures → paste.</li>
          </ol>
          <p className="muted2">It uses your name, headline, phone, email and brand colour from <Link href="/app/profile/details">About you</Link> and <Link href="/app/settings">Settings</Link>. The link always opens your live card, so the signature never goes stale.</p>
          {team?.org.bannerText ? <p className="muted2">Your team banner is included automatically.</p> : null}
        </div>
      </div>
    </>
  );
}

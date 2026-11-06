import { headers } from "next/headers";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { membership } from "@/lib/org";
import PageHead from "@/components/page-head";
import CopyButton from "@/components/copy-button";
import ShareButtons from "@/components/share-buttons";
import EmailSignature from "@/components/email-signature";
import { buildSignature, buildBanner } from "@/lib/signature";
export const dynamic = "force-dynamic";
export const metadata = { title: "Tools" };

/** Extras around the card: email signature, video-call background, text/email sharing, booth mode. */
export default async function Tools() {
  const { profile } = await requireOwner();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const team = await membership((await requireOwner()).user.id);
  const link = await db.shareLink.findFirst({ where: { profileId: profile.id, mode: "ALL" } });
  const url = link ? `${origin}/s/${link.token}` : `${origin}/${profile.handle}`;
  const sig = buildSignature(profile, url, buildBanner(team?.org, profile.theme));
  const msg = `Hi, here is my digital card: ${url}`;

  return (
    <>
      <PageHead title="Tools" sub="More ways to put your card in front of people." back="/app/more" />

      <h2 style={{ fontSize: 16 }}>Email signature</h2>
      <EmailSignature html={sig} />

      <h2 style={{ fontSize: 16 }}>Video-call background</h2>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>A 1920×1080 background with your name and QR code at the sides. Set it in Zoom, Meet or Teams so people can scan you on screen.</p>
        <a className="btn" href={`/card/${profile.handle}/background`} download={`${profile.handle}-background.png`}>Download background</a>
      </div>

      <h2 style={{ fontSize: 16 }}>Send my card</h2>
      <div className="card">
        <div className="row" style={{ flexWrap: "wrap" }}>
          <a className="btn" href={`sms:?&body=${encodeURIComponent(msg)}`}>Text message</a>
          <a className="btn ghost" href={`mailto:?subject=${encodeURIComponent(`${profile.name}'s digital card`)}&body=${encodeURIComponent(msg)}`}>Email</a>
          <a className="btn ghost" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <CopyButton text={url} label="Copy link" />
        </div>
        <ShareButtons url={url} title={`${profile.name}'s card`} />
        <a className="btn ghost" style={{ marginTop: 8 }} href={`/${profile.handle}/vcard`}>My contact file (.vcf)</a>
      </div>

      <h2 style={{ fontSize: 16 }}>Booth mode</h2>
      <Link href="/app/booth" className="menu-row"><span className="menu-ico">▦</span><span style={{ flex: 1 }}><b>Full-screen QR</b><span className="muted" style={{ display: "block" }}>For events: a big QR people can scan from a distance</span></span><span className="muted">›</span></Link>

      <h2 style={{ fontSize: 16 }}>Contacts</h2>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>Download everyone you are connected with.</p>
        <div className="row"><a className="btn ghost" href="/app/contacts/export?format=csv">CSV</a><a className="btn ghost" href="/app/contacts/export?format=vcf">vCard</a></div>
      </div>
    </>
  );
}

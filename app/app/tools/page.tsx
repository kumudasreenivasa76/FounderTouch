import { headers } from "next/headers";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { byline, themeOf, readable } from "@/lib/look";
import { membership } from "@/lib/org";
import PageHead from "@/components/page-head";
import CopyButton from "@/components/copy-button";
import ShareButtons from "@/components/share-buttons";
import EmailSignature from "@/components/email-signature";
export const dynamic = "force-dynamic";
export const metadata = { title: "Tools" };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** Extras around the card: email signature, video-call background, text/email sharing, booth mode. */
export default async function Tools() {
  const { profile } = await requireOwner();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const team = await membership((await requireOwner()).user.id);
  const banner = team?.org.bannerText ? `<div style="margin-top:8px;padding:6px 0;border-top:1px solid #e3e6ec">${team.org.bannerUrl ? `<a href="${esc(team.org.bannerUrl)}" style="color:${readable(themeOf(profile.theme).from)}">${esc(team.org.bannerText)}</a>` : esc(team.org.bannerText)}</div>` : "";
  const link = await db.shareLink.findFirst({ where: { profileId: profile.id, mode: "ALL" } });
  const url = link ? `${origin}/s/${link.token}` : `${origin}/${profile.handle}`;
  const t = themeOf(profile.theme);
  const rc = readable(t.from);
  const sub = byline(profile.headline, profile.company);
  const sig = `<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px;color:#1c2330"><tr><td style="border-left:4px solid ${t.from};padding-left:12px"><div style="font-size:16px;font-weight:bold">${esc(profile.name)}</div>${sub ? `<div style="color:#566074">${esc(sub)}</div>` : ""}<div style="margin-top:6px">${[profile.phone && esc(profile.phone), profile.email && `<a href="mailto:${esc(profile.email)}" style="color:${rc}">${esc(profile.email)}</a>`].filter(Boolean).join(" · ")}</div><div style="margin-top:6px"><a href="${esc(url)}" style="color:${rc};font-weight:bold">View my digital card</a></div>${banner}</td></tr></table>`;
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

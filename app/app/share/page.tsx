import QRCode from "qrcode";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MODE_INFO, Mode, modeSlug } from "@/lib/modes";
import Avatar from "@/components/avatar";
import Icon from "@/components/icon";
import PageHead from "@/components/page-head";
import ShareActions from "./share-actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Share Your Card" };

/** Share, Tap (NFC) & Scan (design 14): one card's QR, plus tap, link, download and the share sheet. */
export default async function Share({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { profile } = await requireOwner();
  const sp = await searchParams;
  const mode = (MODES as readonly string[]).includes(sp.mode ?? "") ? sp.mode! : "ALL";
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const [link, slug, cfgs] = await Promise.all([
    db.shareLink.findFirst({ where: { profileId: profile.id, mode } }),
    db.cardSlug.findFirst({ where: { profileId: profile.id, mode } }),
    db.modeConfig.findMany({ where: { profileId: profile.id, isEnabled: true }, select: { mode: true } }),
  ]);
  const url = link ? `${origin}/s/${link.token}` : `${origin}/${profile.handle}/${modeSlug(mode)}`;
  const qr = await QRCode.toDataURL(link ? `${url}?src=qr` : url, { errorCorrectionLevel: "H", margin: 1, width: 640, color: { dark: "#1B1340", light: "#ffffff" } });
  const label = slug?.slug ?? `${profile.handle}/${modeSlug(mode)}`;
  const modes = ["ALL", ...MODES.filter((m) => m !== "ALL")].filter((m) => cfgs.some((c) => c.mode === m));
  return (
    <>
      <PageHead title="Share Your Card" back="/app" />
      {modes.length > 1 && (
        <nav className="d-chips" aria-label="Which card">
          {modes.map((m) => <a key={m} href={`/app/share?mode=${m}`} aria-current={m === mode ? "page" : undefined}>{m === "ALL" ? "Full profile" : MODE_INFO[m as Mode].label}</a>)}
        </nav>
      )}
      <div className="d-share">
        <Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} size={84} />
        <b>{profile.name}</b>
        <span>TapNodd/{label}</span>
        <div className="d-share-qr"><img src={qr} alt={`QR code for ${profile.name}'s card`} width={170} height={170} /></div>
        <small>Tap or Scan to View</small>
      </div>
      <ShareActions url={url} qr={qr} file={`${profile.handle}-${modeSlug(mode)}-qr.png`} title={`${profile.name} · TapNodd`} />
      <p className="d-t2" style={{ textAlign: "center", marginTop: 14 }}><Icon name="eye" size={14} /> Every scan and tap shows up in your stats.</p>
    </>
  );
}

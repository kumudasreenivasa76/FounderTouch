import QRCode from "qrcode";
import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { gradient } from "@/lib/look";
export const dynamic = "force-dynamic";
export const metadata = { title: "Booth mode" };

/** Booth mode: one large QR on a bright screen, for events and tables. */
export default async function Booth() {
  const { profile } = await requireOwner();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const link = await db.shareLink.findFirst({ where: { profileId: profile.id, mode: "ALL" } });
  const qr = await QRCode.toDataURL(link ? `${origin}/s/${link.token}?src=qr` : `${origin}/${profile.handle}`, { errorCorrectionLevel: "H", margin: 1, width: 900 });
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: gradient(profile.theme), color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{profile.name}</div>
      <div style={{ background: "#fff", borderRadius: 24, padding: 16 }}><img src={qr} alt="QR code to open my card" style={{ width: "min(78vw, 60vh)", height: "auto", display: "block" }} /></div>
      <div style={{ fontSize: 20 }}>Scan to connect</div>
      <Link href="/app/tools" style={{ color: "#fff", textDecoration: "underline", opacity: 0.85 }}>Exit booth mode</Link>
    </div>
  );
}

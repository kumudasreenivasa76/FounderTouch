import QRCode from "qrcode";
import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canView } from "@/lib/access";
import { byline, themeOf } from "@/lib/look";
import { MODES } from "@/lib/modes";
import { bgFromQuery, parseBgPrefs } from "@/lib/background";

type Look = { bg: string; ink: string; sub: string; blob: string; blobOpacity: number; line?: string };

/** 1920x1080 video-call background: name at one bottom corner, QR at the other, the middle left clear for the person. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = await db.profile.findUnique({ where: { handle } });
  if (!p) return new NextResponse("Not found", { status: 404 });
  const o = bgFromQuery(req.nextUrl.searchParams, parseBgPrefs(p.bgPrefs));
  const mode = (MODES as readonly string[]).includes(o.mode) ? o.mode : "ALL";
  const cfg = await db.modeConfig.findFirst({ where: { profileId: p.id, mode } });
  const link = await db.shareLink.findFirst({ where: { profileId: p.id, mode } });
  if (!cfg || !link || !cfg.isEnabled) return new NextResponse("Not found", { status: 404 });
  if (!(await canView(p, mode, cfg.requireApproval))) return new NextResponse("This card needs the owner's approval.", { status: 403 });

  const origin = req.nextUrl.origin;
  const t = themeOf(p.theme);
  const qr = o.qr ? await QRCode.toDataURL(`${origin}/s/${link.token}?src=qr`, { margin: 1, width: 520, errorCorrectionLevel: "M", color: { dark: "#16131f", light: "#ffffff" } }) : "";
  const sub = byline(p.headline, p.company);
  const address = `${req.nextUrl.host}/${p.handle}`;
  const brand = `linear-gradient(135deg, ${t.from}, ${t.to})`;

  const LOOKS: Record<string, Look> = {
    brand: { bg: brand, ink: "#ffffff", sub: "rgba(255,255,255,.92)", blob: "#ffffff", blobOpacity: 0.09 },
    aurora: { bg: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #f0abfc 100%)", ink: "#ffffff", sub: "rgba(255,255,255,.92)", blob: "#ffffff", blobOpacity: 0.1 },
    midnight: { bg: "linear-gradient(160deg, #120d2b 0%, #2a1b5e 100%)", ink: "#ffffff", sub: "#c4b5fd", blob: "#8b5cf6", blobOpacity: 0.22 },
    studio: { bg: "linear-gradient(180deg, #1b1e25 0%, #0f1115 100%)", ink: "#ffffff", sub: "#a8b0c0", blob: "#ffffff", blobOpacity: 0.03, line: brand },
    paper: { bg: "linear-gradient(160deg, #ffffff 0%, #ece5fb 100%)", ink: "#1c2330", sub: "#566074", blob: t.from, blobOpacity: 0.09, line: brand },
    split: { bg: "linear-gradient(160deg, #faf8ff 0%, #efeaf8 100%)", ink: "#ffffff", sub: "rgba(255,255,255,.92)", blob: t.from, blobOpacity: 0.06 },
  };
  const L = LOOKS[o.style] ?? LOOKS.brand;
  const left = o.side === "left";

  const nameBlock = (
    <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
      <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1, color: L.ink }}>{p.name}</div>
      {o.title && sub && <div style={{ display: "flex", fontSize: 32, marginTop: 12, color: L.sub }}>{sub}</div>}
      {o.address && <div style={{ display: "flex", fontSize: 24, marginTop: 14, color: L.sub, opacity: 0.85 }}>{address}</div>}
    </div>
  );
  const qrBlock = o.qr ? (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", background: "#ffffff", borderRadius: 28, padding: 18, boxShadow: "0 24px 60px rgba(0,0,0,.28)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} width={250} height={250} alt="" />
      </div>
      {o.label && <div style={{ display: "flex", marginTop: 16, fontSize: 26, fontWeight: 600, color: o.style === "split" ? "#3d3270" : L.ink }}>{o.label}</div>}
    </div>
  ) : <div style={{ display: "flex" }} />;
  const logo = o.logo && p.logo ? (
    <div style={{ position: "absolute", top: 64, [left ? "right" : "left"]: 80, display: "flex", background: "rgba(255,255,255,.94)", borderRadius: 20, padding: "14px 24px" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${origin}/logo/${p.handle}`} height={64} alt="" style={{ height: 64 }} />
    </div>
  ) : null;
  const blobs = (
    <>
      <div style={{ position: "absolute", top: -260, right: -180, width: 760, height: 760, borderRadius: 760, background: L.blob, opacity: L.blobOpacity }} />
      <div style={{ position: "absolute", bottom: -320, left: -220, width: 820, height: 820, borderRadius: 820, background: L.blob, opacity: L.blobOpacity * 0.8 }} />
      <div style={{ position: "absolute", top: 140, left: 620, width: 220, height: 220, borderRadius: 220, background: L.blob, opacity: L.blobOpacity * 0.7 }} />
    </>
  );

  const body = o.style === "split" ? (
    <div style={{ display: "flex", flexDirection: left ? "row-reverse" : "row", width: "100%", height: "100%", background: L.bg, position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: 600, height: "100%", padding: 72, background: brand, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -200, left: -160, width: 560, height: 560, borderRadius: 560, background: "#ffffff", opacity: 0.1 }} />
        {nameBlock}
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "flex-end", justifyContent: left ? "flex-start" : "flex-end", padding: 80, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -240, right: -160, width: 700, height: 700, borderRadius: 700, background: L.blob, opacity: L.blobOpacity }} />
        {qrBlock}
      </div>
      {logo}
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: left ? "row-reverse" : "row", width: "100%", height: "100%", background: L.bg, padding: 80, alignItems: "flex-end", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
      {blobs}
      {L.line && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, background: L.line }} />}
      {nameBlock}
      {qrBlock}
      {logo}
    </div>
  );

  return new ImageResponse(body, { width: 1920, height: 1080, headers: { "Content-Disposition": `inline; filename="${handle}-background.png"`, "Cache-Control": "no-store" } });
}

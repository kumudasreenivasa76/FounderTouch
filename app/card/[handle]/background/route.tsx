import QRCode from "qrcode";
import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canView } from "@/lib/access";
import { byline, gradient } from "@/lib/look";

/** 1920x1080 video-call background: name on the left, QR on the right, the middle left clear for the person. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = await db.profile.findUnique({ where: { handle } });
  if (!p) return new NextResponse("Not found", { status: 404 });
  const cfg = await db.modeConfig.findFirst({ where: { profileId: p.id, mode: "ALL" } });
  const link = await db.shareLink.findFirst({ where: { profileId: p.id, mode: "ALL" } });
  if (!cfg || !link || !cfg.isEnabled) return new NextResponse("Not found", { status: 404 });
  if (!(await canView(p, "ALL", cfg.requireApproval))) return new NextResponse("This card needs the owner's approval.", { status: 403 });
  const qr = await QRCode.toDataURL(`${req.nextUrl.origin}/s/${link.token}?src=qr`, { margin: 1, width: 420 });
  const sub = byline(p.headline, p.company);
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: gradient(p.theme), color: "#fff", padding: 80, alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 520 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{p.name}</div>
          {sub && <div style={{ display: "flex", fontSize: 32, marginTop: 10, opacity: 0.92 }}>{sub}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", background: "#fff", borderRadius: 24, padding: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} width={260} height={260} alt="" />
          </div>
          <div style={{ display: "flex", marginTop: 12, fontSize: 26 }}>Scan to connect</div>
        </div>
      </div>
    ),
    { width: 1920, height: 1080, headers: { "Content-Disposition": `inline; filename="${handle}-background.png"`, "Cache-Control": "no-store" } },
  );
}

import { readFile } from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canView } from "@/lib/access";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import { byline, gradient, parseAvatar } from "@/lib/look";
import { AvatarArt } from "@/components/avatar";
import { svgToString } from "@/lib/svg-string";

const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

/** The card as a 1050x600 PNG, for saving to Photos, printing or adding to a wallet app. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = await db.profile.findUnique({ where: { handle } });
  if (!p) return new NextResponse("Not found", { status: 404 });
  const q = req.nextUrl.searchParams.get("mode") ?? "ALL";
  const mode = ((MODES as readonly string[]).includes(q) ? q : "ALL") as Mode;
  const cfg = await db.modeConfig.findFirst({ where: { profileId: p.id, mode } });
  const link = await db.shareLink.findFirst({ where: { profileId: p.id, mode } });
  if (!cfg || !link || !cfg.isEnabled) return new NextResponse("Not found", { status: 404 });
  if (!(await canView(p, mode, cfg.requireApproval))) return new NextResponse("This card needs the owner's approval.", { status: 403 });

  const origin = req.nextUrl.origin;
  const qr = await QRCode.toDataURL(`${origin}/s/${link.token}?src=qr`, { margin: 1, width: 420 });

  // Photo first, then the illustrated avatar, then initials.
  let avatarSrc = "";
  if (p.photo) {
    try {
      const buf = await readFile(path.join(process.cwd(), "uploads", path.basename(p.photo)));
      avatarSrc = `data:${MIME[path.extname(p.photo)] ?? "image/jpeg"};base64,${buf.toString("base64")}`;
    } catch { /* fall through */ }
  }
  if (!avatarSrc) {
    const art = parseAvatar(p.avatar);
    if (art) avatarSrc = "data:image/svg+xml;base64," + Buffer.from(svgToString(AvatarArt({ cfg: art, size: 200 }))).toString("base64");
  }
  const initials = p.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  const lines = [p.phone, p.email, p.website.replace(/^https?:\/\//, "")].filter(Boolean);
  const sub = byline(p.headline, p.company);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: gradient(p.theme), color: "#fff", padding: 56, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {avatarSrc
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatarSrc} width={150} height={150} style={{ borderRadius: 75, border: "6px solid rgba(255,255,255,.85)", objectFit: "cover" }} alt="" />
              : <div style={{ display: "flex", width: 150, height: 150, borderRadius: 75, background: "rgba(255,255,255,.25)", alignItems: "center", justifyContent: "center", fontSize: 58, fontWeight: 700 }}>{initials}</div>}
            <div style={{ display: "flex", marginLeft: 24, padding: "8px 20px", borderRadius: 40, background: "rgba(255,255,255,.22)", fontSize: 26 }}>{MODE_INFO[mode].label}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 60, fontWeight: 700, lineHeight: 1.1 }}>{p.name}</div>
            {sub && <div style={{ display: "flex", fontSize: 30, marginTop: 8, opacity: 0.92 }}>{sub}</div>}
            <div style={{ display: "flex", flexDirection: "column", marginTop: 22, fontSize: 25, opacity: 0.95 }}>
              {lines.map((l) => <div key={l} style={{ display: "flex", marginTop: 4 }}>{l}</div>)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginLeft: 40 }}>
          <div style={{ display: "flex", background: "#fff", borderRadius: 28, padding: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} width={300} height={300} alt="" />
          </div>
          <div style={{ display: "flex", marginTop: 16, fontSize: 24, opacity: 0.92 }}>Scan to connect</div>
        </div>
      </div>
    ),
    { width: 1050, height: 600, headers: { "Content-Disposition": `inline; filename="${handle}-card.png"`, "Cache-Control": "no-store" } },
  );
}

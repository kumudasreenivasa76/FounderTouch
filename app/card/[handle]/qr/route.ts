import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MODES } from "@/lib/modes";

/** A plain QR image for a person's page, small enough to sit in an email signature. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = await db.profile.findUnique({ where: { handle } });
  if (!p) return new NextResponse("Not found", { status: 404 });
  const q = req.nextUrl.searchParams.get("mode") ?? "ALL";
  const mode = (MODES as readonly string[]).includes(q) ? q : "";
  const link = mode ? await db.shareLink.findFirst({ where: { profileId: p.id, mode } }) : null;
  // "LINKS" (or an unknown mode) points at the person's link page.
  const target = link ? `${req.nextUrl.origin}/s/${link.token}?src=qr` : `${req.nextUrl.origin}/${p.handle}`;
  const png = await QRCode.toBuffer(target, { errorCorrectionLevel: "M", margin: 1, width: 336, color: { dark: "#1c2330", light: "#ffffff" } });
  return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" } });
}

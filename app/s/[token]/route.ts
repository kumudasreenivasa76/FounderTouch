import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await db.shareLink.findUnique({ where: { token }, include: { profile: true } });
  if (!link) return new NextResponse("Not found", { status: 404 });
  const visitorId = req.cookies.get("vid")?.value ?? randomUUID();
  const src = req.nextUrl.searchParams.get("src");
  await db.scanEvent.create({ data: { shareLinkId: link.id, mode: link.mode, visitorId, source: src === "nfc" ? "nfc" : src === "qr" ? "qr" : "link" } });
  const res = NextResponse.redirect(new URL(`/${link.profile.handle}?mode=${link.mode}`, req.url));
  res.cookies.set("vid", visitorId, { maxAge: 31536000, path: "/" });
  return res;
}

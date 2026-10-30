import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";

/** Short link for NFC cards and stickers. Same as /s/{token} but every open is logged as an NFC tap. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await db.shareLink.findUnique({ where: { token }, include: { profile: true } });
  if (!link) return new NextResponse("Not found", { status: 404 });
  const visitorId = req.cookies.get("vid")?.value ?? randomUUID();
  await db.scanEvent.create({ data: { shareLinkId: link.id, mode: link.mode, visitorId, source: "nfc" } });
  const res = NextResponse.redirect(new URL(`/${link.profile.handle}?mode=${link.mode}`, req.url));
  res.cookies.set("vid", visitorId, { maxAge: 31536000, path: "/" });
  return res;
}

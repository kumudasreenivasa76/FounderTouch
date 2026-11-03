import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { flag } from "@/lib/flags";

const hits = new Map<string, { n: number; t: number }>();
/** Tiny in-memory limiter: 60 taps a minute per IP. */
function limited(ip: string) {
  const now = Date.now(), h = hits.get(ip);
  if (!h || now - h.t > 60_000) { hits.set(ip, { n: 1, t: now }); return false; }
  return ++h.n > 60;
}

/** Permanent NFC tag URL. Resolves the tag's current mode on every tap, so the tag never needs rewriting. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (limited(ip)) return new NextResponse("Too many taps", { status: 429 });
  if (!flag("nfc_switchable_target")) return new NextResponse("Not found", { status: 404 });
  const { token } = await params;
  const tag = await db.nfcTag.findUnique({ where: { token }, include: { profile: { include: { modes: true } } } });
  const noStore = { "Cache-Control": "no-store" };
  if (!tag || !tag.enabled) return new NextResponse("This tag is not active.", { status: 404, headers: noStore });
  const cfg = tag.profile.modes.find((m) => m.mode === tag.mode);
  const usable = !!cfg && (cfg.isEnabled || tag.mode === "ALL");
  let mode = tag.mode;
  if (!usable) {
    if (tag.fallback === "UNAVAILABLE") return new NextResponse("This card is not available right now.", { status: 404, headers: noStore });
    mode = "ALL";
  }
  const link = await db.shareLink.findFirst({ where: { profileId: tag.profileId, mode } });
  const visitorId = req.cookies.get("vid")?.value ?? randomUUID();
  if (link) await db.scanEvent.create({ data: { shareLinkId: link.id, mode, visitorId, source: "nfc" } });
  await db.nfcTag.update({ where: { id: tag.id }, data: { taps: { increment: 1 }, lastTapAt: new Date() } });
  const res = NextResponse.redirect(new URL(`/${tag.profile.handle}?mode=${mode}`, req.url), 307);
  res.headers.set("Cache-Control", "no-store");
  res.cookies.set("vid", visitorId, { maxAge: 31536000, path: "/" });
  return res;
}

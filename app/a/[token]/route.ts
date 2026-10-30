import { NextRequest, NextResponse } from "next/server";
import { db, MODE_ACCESS_DAYS } from "@/lib/db";
import { accessCookie } from "@/lib/access";

/** The private link the owner sends after approving someone: unlocks that mode on this device. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await db.modeRequest.findUnique({ where: { token } });
  const ok = r && r.status === "APPROVED" && r.decidedAt && Date.now() - r.decidedAt.getTime() < MODE_ACCESS_DAYS * 86400_000;
  if (!r || !ok) return new NextResponse("This access link is not valid or has expired. Ask the owner for a new one.", { status: 403 });
  const profile = await db.profile.findUnique({ where: { id: r.profileId } });
  if (!profile) return new NextResponse("Not found", { status: 404 });
  const res = NextResponse.redirect(new URL(`/${profile.handle}?mode=${r.mode}`, req.url));
  res.cookies.set(accessCookie(r.profileId, r.mode), token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: MODE_ACCESS_DAYS * 86400 });
  return res;
}

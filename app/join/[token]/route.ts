import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { applyBrand, audit, membership } from "@/lib/org";

/** Private invite link. Signed in: joins the team and gets the team brand. Signed out: log in first, then come back here. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await db.orgInvite.findUnique({ where: { token }, include: { org: true } });
  if (!inv) return new NextResponse("This invite link is not valid. Ask your admin for a new one.", { status: 404 });
  const u = await currentUser();
  if (!u) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent("/join/" + token)}`, req.url));
  if (u.email.toLowerCase() !== inv.email) return new NextResponse(`This invite was sent to ${inv.email}. Log in with that account to accept it.`, { status: 403 });
  if (!u.profile) return NextResponse.redirect(new URL("/onboarding", req.url));
  if (await membership(u.id)) return NextResponse.redirect(new URL("/app/org", req.url));
  await db.orgMember.create({ data: { orgId: inv.orgId, userId: u.id, role: inv.role } });
  await db.orgInvite.delete({ where: { id: inv.id } });
  await audit(inv.orgId, u.id, "member.joined", u.email);
  await applyBrand(u.profile.id, inv.org);
  return NextResponse.redirect(new URL("/app/org", req.url));
}

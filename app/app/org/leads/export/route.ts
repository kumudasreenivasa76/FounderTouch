import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { membership } from "@/lib/org";

const csv = (v: string | number | Date | null) => {
  let s = v instanceof Date ? v.toISOString() : String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

/** Team-wide leads as CSV, with the rep who captured each one. Admins only. */
export async function GET(req: NextRequest) {
  const { user } = await requireOwner();
  const m = await membership(user.id);
  if (!m || !m.isAdmin) return new NextResponse("Not found", { status: 404 });
  const sp = req.nextUrl.searchParams;
  const members = await db.orgMember.findMany({ where: { orgId: m.org.id } });
  const profiles = await db.profile.findMany({ where: { userId: { in: members.map((x) => x.userId) } }, select: { id: true, name: true } });
  const rows = (await db.contact.findMany({ where: { profileId: { in: profiles.map((p) => p.id) }, status: { in: ["CONNECTED", "PENDING"] } }, orderBy: { createdAt: "desc" } }))
    .filter((c) => (!sp.get("rep") || c.profileId === sp.get("rep")) && (!sp.get("source") || c.source === sp.get("source")) && (!sp.get("tag") || c.tags.split(",").includes(sp.get("tag")!)));
  const head = ["Name", "Email", "Company", "Status", "Source", "Mode", "Tags", "Captured by", "Notes", "Added"];
  const lines = [head.map(csv).join(",")].concat(rows.map((c) => [c.name, c.email, c.company, c.status, c.source, c.mode, c.tags, profiles.find((p) => p.id === c.profileId)?.name ?? "", c.notes, c.createdAt].map(csv).join(",")));
  return new NextResponse(lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="team-leads.csv"' } });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

const csv = (v: string | number | Date | null) => {
  let s = v instanceof Date ? v.toISOString() : String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};
const vesc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[;,]/g, (c) => "\\" + c).replace(/\r?\n/g, "\\n");

/** Your connected contacts as CSV or vCard. Only people who are connected are exported. */
export async function GET(req: NextRequest) {
  const { profile } = await requireOwner();
  const rows = await db.contact.findMany({ where: { profileId: profile.id, status: "CONNECTED" }, orderBy: { createdAt: "desc" } });
  if (req.nextUrl.searchParams.get("format") === "vcf") {
    const body = rows.map((c) => ["BEGIN:VCARD", "VERSION:3.0", `FN:${vesc(c.name)}`, c.company && `ORG:${vesc(c.company)}`, `EMAIL:${c.email}`, c.linkedin && `URL:${c.linkedin}`, c.notes && `NOTE:${vesc(c.notes)}`, "END:VCARD"].filter(Boolean).join("\r\n")).join("\r\n") + "\r\n";
    return new NextResponse(body, { headers: { "Content-Type": "text/vcard; charset=utf-8", "Content-Disposition": 'attachment; filename="contacts.vcf"' } });
  }
  const head = ["Name", "Email", "Company", "Mode", "Source", "Tags", "Notes", "Follow-up", "Last interaction", "Added"];
  const lines = [head.map(csv).join(",")].concat(rows.map((c) => [c.name, c.email, c.company, c.mode, c.source, c.tags, c.notes, c.followUpAt, c.lastInteractionAt, c.createdAt].map(csv).join(",")));
  return new NextResponse(lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="contacts.csv"' } });
}

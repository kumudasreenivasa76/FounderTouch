import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[;,]/g, (c) => "\\" + c).replace(/\r?\n/g, "\\n");

/** One of your connections as a contact file, to save on your phone. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireOwner();
  const c = await db.contact.findFirst({ where: { id, profileId: profile.id } });
  if (!c) return new NextResponse("Not found", { status: 404 });
  const parts = c.name.trim().split(/\s+/);
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${esc(c.name)}`, `N:${esc(parts.slice(-1)[0])};${esc(parts.slice(0, -1).join(" "))};;;`, c.company && `ORG:${esc(c.company)}`, c.jobTitle && `TITLE:${esc(c.jobTitle)}`, `EMAIL:${c.email}`, c.phone && `TEL;TYPE=CELL:${c.phone}`, c.linkedin && `URL:${c.linkedin}`, (c.notes || c.metAt) && `NOTE:${esc([c.metAt && "Met: " + c.metAt, c.notes].filter(Boolean).join(". "))}`, "END:VCARD"].filter(Boolean);
  return new NextResponse(lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/vcard; charset=utf-8", "Content-Disposition": `attachment; filename="${c.name.replace(/[^\w-]+/g, "-").toLowerCase() || "contact"}.vcf"` } });
}

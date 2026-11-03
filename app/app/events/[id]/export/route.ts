import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

const csv = (v: string | number | Date | null) => {
  let s = v instanceof Date ? v.toISOString() : String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

/** Everyone registered for one of your events, with their answers, as CSV. Owner only. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireOwner();
  const e = await db.event.findFirst({ where: { id, profileId: profile.id }, include: { attendees: { orderBy: { createdAt: "asc" } }, tickets: true } });
  if (!e) return new NextResponse("Not found", { status: 404 });
  const head = ["Name", "Email", "Company", "Status", "Ticket", "Guests", "Answers", "Checked in", "Registered"];
  const lines = [head.map(csv).join(",")].concat(e.attendees.map((a) => [a.name, a.email, a.company, a.status, e.tickets.find((t) => t.id === a.ticketClassId)?.name ?? "General", a.guests, a.answers === "{}" ? "" : a.answers, a.checkedInAt, a.createdAt].map(csv).join(",")));
  return new NextResponse(lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${e.slug}-guests.csv"` } });
}

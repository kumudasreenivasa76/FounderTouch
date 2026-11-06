import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** Calendar file for an event, so attendees can add it to any calendar app. */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ev = await db.event.findUnique({ where: { slug } });
  if (!ev || !ev.published || !ev.startsAt) return new NextResponse("Not found", { status: 404 });
  const end = ev.endsAt ?? new Date(ev.startsAt.getTime() + 2 * 3600_000);
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TapNodd//EN", "BEGIN:VEVENT",
    `UID:${ev.id}@tapnodd`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(ev.startsAt)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(ev.name)}`, `DESCRIPTION:${esc(ev.summary || ev.description.slice(0, 300))}`, `LOCATION:${esc(ev.onlineUrl || ev.location)}`,
    "END:VEVENT", "END:VCALENDAR",
  ];
  return new NextResponse(lines.join("\r\n"), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${ev.slug}.ics"` } });
}

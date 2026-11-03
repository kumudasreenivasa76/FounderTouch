import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { themeOf, gradient } from "@/lib/look";
import PageHead from "@/components/page-head";
import { createEvent } from "./actions";
import EventWizard from "@/components/event-wizard";
export const dynamic = "force-dynamic";
export const metadata = { title: "Events" };

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { dateStyle: "medium" }) : "");

export default async function Events({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const events = await db.event.findMany({
    where: { profileId: profile.id },
    include: { _count: { select: { attendees: true, projects: true } }, attendees: { where: { checkedInAt: { not: null } }, select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });
  const t = themeOf(profile.theme);
  return (
    <>
      <PageHead title="Events" sub="Run a meetup or hackathon: registration, tickets, check-in at the door and a branded event page." back="/app" error={sp.err ? "Give the event a name." : undefined} />

      {events.length === 0 && <div className="card muted">No events yet. Create your first one below.</div>}
      {events.map((e) => (
        <Link key={e.id} href={`/app/events/${e.id}`} className="menu-row" style={{ alignItems: "stretch", padding: 0, overflow: "hidden" }}>
          <span style={{ width: 8, background: e.color1 ? `linear-gradient(${e.color1}, ${e.color2 || e.color1})` : gradient(profile.theme) }} />
          <span style={{ flex: 1, minWidth: 0, padding: "12px 4px 12px 12px" }}>
            <b>{e.name}</b>
            <span className="muted" style={{ display: "block" }}>{[fmt(e.startsAt), e.location].filter(Boolean).join(" · ") || "No date yet"}</span>
            <span className="muted" style={{ display: "block" }}>{e._count.attendees} registered · {e.attendees.length} checked in · {e._count.projects} projects</span>
          </span>
          <span style={{ padding: 12 }}><span className={"pill" + (e.published && e.open ? " on" : "")} style={{ margin: 0 }}>{!e.published ? "Draft" : e.open ? "Open" : "Closed"}</span></span>
        </Link>
      ))}

      <EventWizard action={createEvent} />
      <span style={{ display: "none" }}>{t.from}</span>
    </>
  );
}

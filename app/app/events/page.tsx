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
      <PageHead title="Events" back="/app/discover" error={sp.err ? "Give the event a name." : undefined} />

      <nav className="d-tabs" aria-label="Events">
        <Link href="/app/events" aria-current="page">My Events ({events.length})</Link>
        <Link href="/app/discover?t=events">All Events</Link>
      </nav>
      {events.length === 0 && <div className="d-empty"><b>No events yet</b>Create your first one below.</div>}
      {events.map((e, i) => {
        const status = !e.published ? "Draft" : e.open ? "Open" : "Closed";
        const stats = `${e._count.attendees} registered · ${e.attendees.length} checked in`;
        const when = [fmt(e.startsAt), e.location].filter(Boolean).join(" • ") || "No date yet";
        const bg = e.cover ? `url(/event-img/${e.slug}/cover) center/cover` : e.color1 ? `linear-gradient(135deg, ${e.color1}, ${e.color2 || e.color1})` : gradient(profile.theme);
        return i === 0 ? (
          <Link key={e.id} href={`/app/events/${e.id}`} className="d-card d-evhero">
            <span className="d-evimg" style={{ background: bg }} aria-hidden><span className={"d-chip " + (status === "Open" ? "g" : "n")}>{status}</span></span>
            <span className="d-evbody">
              <b>{e.name}</b>
              <span className="d-t2">{when}</span>
              <span className="d-chips" style={{ margin: "4px 0 0" }}><span className="d-chip">{e._count.attendees} registered</span><span className="d-chip">{e.attendees.length} checked in</span>{e._count.projects > 0 && <span className="d-chip">{e._count.projects} projects</span>}</span>
              <span className="btn sm" style={{ marginTop: 6 }}>Manage Event</span>
            </span>
          </Link>
        ) : (
          <Link key={e.id} href={`/app/events/${e.id}`} className="d-li" style={{ padding: 8 }}>
            <span className="d-evthumb" style={{ background: bg }} aria-hidden />
            <span><b>{e.name}</b><span>{when}</span><span>{stats}</span></span>
            <span className={"d-chip " + (status === "Open" ? "g" : "n")}>{status}</span>
          </Link>
        );
      })}
      <h2 className="d-sec">Create an Event</h2>
      <EventWizard action={createEvent} />
      <span style={{ display: "none" }}>{t.from}</span>
    </>
  );
}

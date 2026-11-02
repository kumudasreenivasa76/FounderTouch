import Link from "next/link";
import { db } from "@/lib/db";
import { closeEvent } from "../actions";
import { day } from "../ui";

export default async function Events() {
  const events = await db.event.findMany({
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
    include: { profile: { select: { name: true, userId: true } }, _count: { select: { attendees: true, projects: true, jobs: true } } },
  });
  const checked = await db.attendee.groupBy({ by: ["eventId"], where: { checkedInAt: { not: null } }, _count: true });
  const now = new Date();
  return (
    <>
      <div className="ad-head"><div><h1>Events</h1><p>Every event run on FounderTouch, with registration and check-in.</p></div></div>
      <div className="ad-panel">
        {events.length === 0 ? <div className="ad-empty">No events yet.</div> : (
          <table className="ad-table">
            <thead><tr><th>Event</th><th>Organiser</th><th>When</th><th className="num">Registered</th><th className="num">Checked in</th><th className="num">Projects</th><th className="num">Roles</th><th>Status</th><th /></tr></thead>
            <tbody>
              {events.map((e) => {
                const past = e.endsAt ? e.endsAt < now : e.startsAt ? e.startsAt < now : false;
                return (
                  <tr key={e.id}>
                    <td><a href={`/e/${e.slug}`} target="_blank" rel="noreferrer" className="ad-who"><span className="ad-ava" style={{ background: e.color1 || "var(--sunken)" }} /><div><b>{e.name}</b><small>{e.location}</small></div></a></td>
                    <td>{e.profile.userId ? <Link href={`/admin/users/${e.profile.userId}`}>{e.profile.name}</Link> : e.profile.name}</td>
                    <td className="muted">{day(e.startsAt) || "No date"}</td>
                    <td className="num">{e._count.attendees}{e.capacity ? <span className="muted"> / {e.capacity}</span> : ""}</td>
                    <td className="num">{checked.find((c) => c.eventId === e.id)?._count ?? 0}</td>
                    <td className="num">{e._count.projects}</td>
                    <td className="num">{e._count.jobs}</td>
                    <td><span className={"ad-tag " + (!e.open ? "bad" : past ? "" : "good")}>{!e.open ? "Closed" : past ? "Finished" : "Open"}</span></td>
                    <td className="num"><form action={closeEvent}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="open" value={e.open ? "0" : "1"} /><button className="ghost sm">{e.open ? "Close" : "Reopen"}</button></form></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

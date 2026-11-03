import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { MODES, MODE_INFO } from "@/lib/modes";

export default async function Overview() {
  const { profile } = await requireOwner();
  const pid = profile.id;
  const now = new Date(), endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const since = new Date(now.getTime() - 13 * 864e5); since.setHours(0, 0, 0, 0);
  const [total, pending, due, starred, events, openJobs, apps, newApps, byMode, bySource, scans, recent, upcoming] = await Promise.all([
    db.contact.count({ where: { profileId: pid, status: "CONNECTED" } }),
    db.contact.count({ where: { profileId: pid, status: "PENDING" } }),
    db.contact.count({ where: { profileId: pid, status: "CONNECTED", followUpAt: { lte: endOfToday } } }),
    db.contact.count({ where: { profileId: pid, starred: true } }),
    db.event.count({ where: { profileId: pid } }),
    db.job.count({ where: { profileId: pid, open: true } }),
    db.application.count({ where: { profileId: pid } }),
    db.application.count({ where: { profileId: pid, status: "NEW" } }),
    db.contact.groupBy({ by: ["mode"], where: { profileId: pid, status: { not: "BLOCKED" } }, _count: true }),
    db.contact.groupBy({ by: ["source"], where: { profileId: pid, status: { not: "BLOCKED" } }, _count: true }),
    db.scanEvent.findMany({ where: { shareLink: { profileId: pid }, createdAt: { gte: since } }, select: { createdAt: true } }),
    db.contactActivity.findMany({ where: { contact: { profileId: pid } }, orderBy: { createdAt: "desc" }, take: 8, include: { contact: { select: { id: true, name: true } } } }),
    db.event.findMany({ where: { profileId: pid, OR: [{ startsAt: null }, { startsAt: { gte: now } }] }, orderBy: { startsAt: "asc" }, take: 4, include: { _count: { select: { attendees: true } } } }),
  ]);
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(since.getTime() + i * 864e5); return { key: d.toDateString(), label: d.getDate(), n: 0 }; });
  for (const s of scans) { const d = days.find((x) => x.key === s.createdAt.toDateString()); if (d) d.n++; }
  const maxDay = Math.max(1, ...days.map((d) => d.n));
  const modeMax = Math.max(1, ...byMode.map((m) => m._count));
  const srcMax = Math.max(1, ...bySource.map((m) => m._count));
  const ago = (d: Date) => { const m = Math.round((now.getTime() - d.getTime()) / 60000); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };

  return (
    <>
      <h2>Overview</h2>
      <div className="dash-sub">Everyone you meet through your card, across all modes.</div>
      <div className="kpis">
        <Link href="/dashboard/all" className="kpi"><b>{total}</b><span>Connections</span></Link>
        <Link href="/dashboard/all?stage=pending" className={"kpi" + (pending ? " warn" : "")}><b>{pending}</b><span>Waiting for approval</span></Link>
        <Link href="/dashboard/all?stage=due" className={"kpi" + (due ? " warn" : "")}><b>{due}</b><span>Follow-ups due</span></Link>
        <Link href="/dashboard/all?stage=starred" className="kpi"><b>{starred}</b><span>Starred</span></Link>
        <Link href="/app/events" className="kpi"><b>{events}</b><span>Events</span></Link>
        <Link href="/app/hire" className="kpi"><b>{openJobs}</b><span>Open roles</span></Link>
        <Link href="/dashboard/recruiter" className={"kpi" + (newApps ? " warn" : "")}><b>{apps}</b><span>Applications ({newApps} new)</span></Link>
        <div className="kpi"><b>{scans.length}</b><span>Card opens, 14 days</span></div>
      </div>

      <div className="panels">
        <div className="panel">
          <h3>Card opens, last 14 days</h3>
          <div className="spark" role="img" aria-label="Card opens per day">{days.map((d) => <i key={d.key} title={`${d.key}: ${d.n}`} style={{ height: `${(d.n / maxDay) * 100}%` }} />)}</div>
          <div className="spark-x"><span>{days[0].label}</span><span>{days[13].label}</span></div>
        </div>
        <div className="panel">
          <h3>Contacts by mode</h3>
          {MODES.map((m) => { const n = byMode.find((x) => x.mode === m)?._count ?? 0; return (
            <Link key={m} href={`/dashboard/${m.toLowerCase()}`} className="bar-row" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="lbl">{MODE_INFO[m].icon} {MODE_INFO[m].label}</span><span className="bar"><i style={{ width: `${(n / modeMax) * 100}%` }} /></span><span className="v">{n}</span>
            </Link>); })}
        </div>
        <div className="panel">
          <h3>Where they came from</h3>
          {bySource.length === 0 && <div className="muted2">No contacts yet.</div>}
          {bySource.map((s) => (
            <div key={s.source} className="bar-row"><span className="lbl" style={{ textTransform: "capitalize" }}>{s.source}</span><span className="bar"><i style={{ width: `${(s._count / srcMax) * 100}%` }} /></span><span className="v">{s._count}</span></div>
          ))}
        </div>
      </div>

      <div className="panels">
        <div className="panel">
          <h3>Recent activity</h3>
          {recent.length === 0 && <div className="muted2">Nothing yet.</div>}
          {recent.map((a) => (
            <div key={a.id} style={{ margin: "7px 0" }}><Link href={`/app/contacts/${a.contact.id}`}><b>{a.contact.name}</b></Link> <span className="muted2">· {a.kind}{a.text ? `: ${a.text}` : ""} · {ago(a.createdAt)}</span></div>
          ))}
        </div>
        <div className="panel">
          <h3>Upcoming events</h3>
          {upcoming.length === 0 && <div className="muted2">No events planned.</div>}
          {upcoming.map((e) => (
            <div key={e.id} style={{ margin: "7px 0" }}><Link href={`/app/events/${e.id}`}><b>{e.name}</b></Link> <span className="muted2">· {e.startsAt ? e.startsAt.toLocaleDateString("en-IN", { dateStyle: "medium" }) : "No date"} · {e._count.attendees} registered</span></div>
          ))}
        </div>
      </div>
    </>
  );
}

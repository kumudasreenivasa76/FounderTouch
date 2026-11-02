import Link from "next/link";
import { db } from "@/lib/db";
import { STATUSES } from "@/lib/hiring";
import { closeJob } from "../actions";
import { ago } from "../ui";

export default async function Jobs() {
  const jobs = await db.job.findMany({ orderBy: { createdAt: "desc" }, include: { profile: { select: { name: true, company: true, userId: true } }, applications: { select: { status: true } }, event: { select: { name: true } } } });
  const totals = STATUSES.map((s) => ({ ...s, n: jobs.reduce((t, j) => t + j.applications.filter((a) => a.status === s.key).length, 0) }));
  const hireMe = await db.profile.count({ where: { openTo: { not: "" } } });
  return (
    <>
      <div className="ad-head"><div><h1>Hiring</h1><p>Roles posted by recruiters, and how applicants are moving.</p></div></div>
      <div className="ad-stats">
        <div className="ad-stat"><small>Open roles</small><b>{jobs.filter((j) => j.open).length}</b><em className="flat">{jobs.length} posted in total</em></div>
        {totals.map((s) => <div className="ad-stat" key={s.key}><small>{s.label}</small><b>{s.n}</b></div>)}
        <div className="ad-stat"><small>Hire me profiles</small><b>{hireMe}</b><em className="flat">people showing a status</em></div>
      </div>
      <div className="ad-panel">
        {jobs.length === 0 ? <div className="ad-empty">No roles posted yet.</div> : (
          <table className="ad-table">
            <thead><tr><th>Role</th><th>Posted by</th><th>Event</th><th className="num">Applicants</th><th>Pipeline</th><th className="num">Posted</th><th>Status</th><th /></tr></thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td><b>{j.title}</b><div className="muted">{[j.workType, j.location].filter(Boolean).join(" · ")}</div></td>
                  <td>{j.profile.userId ? <Link href={`/admin/users/${j.profile.userId}`}>{j.profile.company || j.profile.name}</Link> : j.profile.company || j.profile.name}</td>
                  <td className="muted">{j.event?.name ?? ""}</td>
                  <td className="num">{j.applications.length}</td>
                  <td><div className="ad-actions">{STATUSES.map((s) => { const n = j.applications.filter((a) => a.status === s.key).length; return n ? <span key={s.key} className="ad-tag" style={{ background: s.color + "1a", color: s.color }}>{s.label} {n}</span> : null; })}</div></td>
                  <td className="num muted">{ago(j.createdAt)}</td>
                  <td><span className={"ad-tag " + (j.open ? "good" : "")}>{j.open ? "Open" : "Closed"}</span></td>
                  <td className="num"><form action={closeJob}><input type="hidden" name="id" value={j.id} /><input type="hidden" name="open" value={j.open ? "0" : "1"} /><button className="ghost sm">{j.open ? "Close" : "Reopen"}</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

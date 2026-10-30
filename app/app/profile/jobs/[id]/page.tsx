import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { STATUSES } from "@/lib/hiring";
import { listItems } from "@/lib/modes";
import PageHead from "@/components/page-head";
import { setApplicantStatus, setJobEvent, toggleJob } from "../../job-actions";
export const dynamic = "force-dynamic";

const day = (d: Date) => d.toLocaleDateString("en-IN", { dateStyle: "medium" });

/** Everyone connected to one role: applicants (with a status pipeline) and people who showed interest at the linked event. */
export default async function JobContacts({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const job = await db.job.findFirst({ where: { id, profileId: profile.id }, include: { event: true, applications: { orderBy: { createdAt: "desc" } } } });
  if (!job) notFound();
  const events = await db.event.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" } });
  const interested = await db.attendee.findMany({ where: { event: { profileId: profile.id }, interested: { contains: job.id } }, include: { event: true }, orderBy: { createdAt: "desc" } });
  const candidates = await db.profile.findMany({ where: { handle: { in: job.applications.map((a) => a.candidateHandle).filter(Boolean) } }, include: { career: true } });
  const counts = Object.fromEntries(STATUSES.map((s) => [s.key, job.applications.filter((a) => a.status === s.key).length]));

  return (
    <>
      <PageHead title={job.title} sub={[job.location, job.workType, job.employment, job.salary].filter(Boolean).join(" · ")} back="/app/profile/jobs" saved={!!sp.saved} />

      <div className="stat">
        <div className="card"><b>{job.applications.length}</b><span className="muted">applied</span></div>
        <div className="card"><b>{counts.SHORTLISTED + counts.INTERVIEW}</b><span className="muted">in progress</span></div>
        <div className="card"><b>{interested.length}</b><span className="muted">event interest</span></div>
      </div>

      <form action={setJobEvent} className="card">
        <input type="hidden" name="id" value={job.id} />
        <h3>Hiring event</h3>
        <select name="eventId" defaultValue={job.eventId ?? ""}><option value="">Not tied to an event</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
        <button className="ghost">Save</button>
      </form>
      <form action={toggleJob} style={{ marginBottom: 12 }}><input type="hidden" name="id" value={job.id} /><button className="ghost">{job.open ? "Close this role" : "Reopen this role"}</button></form>

      <h2>🎯 Applicants ({job.applications.length})</h2>
      {job.applications.length === 0 && <div className="card muted">Nobody has applied yet. Share your Recruiter page or the event page.</div>}
      {job.applications.map((a) => {
        const c = candidates.find((x) => x.handle === a.candidateHandle);
        const last = c?.career.filter((x) => x.type === "EXPERIENCE").sort((x, y) => (y.start || "").localeCompare(x.start || ""))[0];
        const st = STATUSES.find((x) => x.key === a.status);
        return (
          <div className="card" key={a.id} style={{ opacity: a.status === "REJECTED" ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <b>{a.name}</b>
              <span className="pill" style={{ margin: 0, height: "fit-content", background: st?.color, color: "#fff" }}>{st?.label}</span>
            </div>
            <div className="muted">{a.email}{a.phone ? ` · ${a.phone}` : ""} · {day(a.createdAt)}</div>
            {c && (
              <div style={{ margin: "6px 0" }}>
                <span className="pill on" style={{ margin: "0 6px 6px 0" }}>⚡ FounderTouch profile</span>
                {c.openTo && <span className="pill">{c.openTo}</span>}
                {last && <span className="pill">{last.title}, {last.org}</span>}
                {listItems(c.skills).slice(0, 4).map((x) => <span key={x} className="pill">{x}</span>)}
              </div>
            )}
            {a.note && <div style={{ margin: "6px 0" }}>&ldquo;{a.note}&rdquo;</div>}
            <div className="row" style={{ margin: "8px 0" }}>
              {c && <a className="btn ghost" href={`/${c.handle}?mode=ALL&pane=hire`} target="_blank">View profile</a>}
              {a.resumeFile && <a className="btn ghost" href={`/applicant-file/${a.id}`} target="_blank">📄 Resume</a>}
              {a.resumeUrl && <a className="btn ghost" href={a.resumeUrl} target="_blank" rel="noopener noreferrer">📄 Resume link</a>}
              <a className="btn ghost" href={`mailto:${a.email}?subject=${encodeURIComponent("Your application: " + job.title)}`}>✉ Email</a>
            </div>
            <form action={setApplicantStatus} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <input type="hidden" name="id" value={a.id} />
              {STATUSES.map((x) => <button key={x.key} name="status" value={x.key} className={a.status === x.key ? "" : "ghost"} style={{ width: "auto", padding: "6px 11px", fontSize: 13, background: a.status === x.key ? x.color : undefined }}>{x.label}</button>)}
            </form>
          </div>
        );
      })}

      <h2>🏆 Interested at the event ({interested.length})</h2>
      {interested.length === 0 && <div className="card muted">{job.event ? "No one has marked this role when registering yet." : "Link this role to an event above to collect interest at registration."}</div>}
      {interested.map((a) => (
        <div className="card" key={a.id}>
          <b>{a.name}</b> {a.checkedInAt && <span className="pill" style={{ background: "#e6f9ef", margin: 0 }}>✅ attended</span>}
          <div className="muted">{a.email}{a.company ? ` · ${a.company}` : ""} · {a.event.name}</div>
          <a className="btn ghost" style={{ marginTop: 8 }} href={`mailto:${a.email}?subject=${encodeURIComponent("About the " + job.title + " role")}`}>✉ Email</a>
        </div>
      ))}
    </>
  );
}

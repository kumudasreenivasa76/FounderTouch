import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { EMPLOYMENT, WORK_TYPES } from "@/lib/hiring";
import PageHead from "@/components/page-head";
import { createJob, deleteJob, toggleJob } from "../job-actions";
export const dynamic = "force-dynamic";

export default async function Jobs({ searchParams }: { searchParams: Promise<{ err?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const jobs = await db.job.findMany({ where: { profileId: profile.id }, include: { _count: { select: { applications: true } }, event: true }, orderBy: { createdAt: "desc" } });
  const events = await db.event.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHead title="Open roles" sub="Roles you post show on your Recruiter page, and candidates apply right there. Applicants land in Contacts." back="/app/profile/kit?mode=RECRUITER" saved={!!sp.saved} error={sp.err ? "Give the role a title." : undefined} />

      {jobs.length === 0 && <div className="card muted">No roles yet. Post your first one below.</div>}
      {jobs.map((j) => (
        <div className="card" key={j.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 16 }}>{j.title}</b>
              <div className="muted">{[j.location, j.workType, j.employment, j.salary].filter(Boolean).join(" · ")}</div>
            </div>
            <span className={"pill" + (j.open ? " on" : "")} style={{ margin: 0, height: "fit-content" }}>{j.open ? "Open" : "Closed"}</span>
          </div>
          {j.event && <div className="muted">🏆 Hiring at {j.event.name}</div>}
          <Link href={`/app/profile/jobs/${j.id}`} className="menu-row" style={{ margin: "8px 0" }}><span style={{ flex: 1 }}><b>{j._count.applications} applicant{j._count.applications === 1 ? "" : "s"}</b><span className="muted" style={{ display: "block" }}>Candidates, contacts and event interest for this role</span></span><span className="muted">›</span></Link>
          <div className="row">
            <form action={toggleJob}><input type="hidden" name="id" value={j.id} /><button className="ghost">{j.open ? "Close role" : "Reopen role"}</button></form>
            <form action={deleteJob}><input type="hidden" name="id" value={j.id} /><button className="ghost">Delete</button></form>
          </div>
        </div>
      ))}

      <form action={createJob} className="card">
        <h3>Post a role</h3>
        <input name="title" placeholder="Job title (e.g. Senior Product Designer)" required />
        <input name="location" placeholder="Location (e.g. Bengaluru)" />
        <div className="row">
          <select name="workType" defaultValue=""><option value="">Work type</option>{WORK_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}</select>
          <select name="employment" defaultValue="Full-time">{EMPLOYMENT.map((w) => <option key={w} value={w}>{w}</option>)}</select>
        </div>
        <input name="salary" placeholder="Pay (optional), e.g. ₹18–25 LPA" />
        <label className="f">Hiring event (optional)</label>
        <select name="eventId" defaultValue=""><option value="">Not tied to an event</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
        <p className="muted" style={{ margin: "0 0 6px" }}>Link a role to a walk-in drive or job fair so it shows on that event&apos;s page. <Link href="/app/events">Create an event →</Link></p>
        <textarea name="description" rows={5} placeholder="What the role involves, what you are looking for…" />
        <input name="skills" placeholder="Key skills, comma separated (e.g. Figma, Prototyping)" />
        <button>Post role</button>
      </form>
    </>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { STATUSES, PIPELINE } from "@/lib/hiring";
export const dynamic = "force-dynamic";
export const metadata = { title: "Recruiting" };

const day = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

/** Recruiting home: how every role is doing, what needs you, and where to find people. */
export default async function Hire() {
  const { profile } = await requireOwner();
  const jobs = await db.job.findMany({ where: { profileId: profile.id }, include: { applications: { select: { id: true, status: true, name: true, interviewAt: true } }, event: true }, orderBy: [{ open: "desc" }, { createdAt: "desc" }] });
  const apps = jobs.flatMap((j) => j.applications.map((a) => ({ ...a, jobId: j.id, jobTitle: j.title })));
  const count = (s: string) => apps.filter((a) => a.status === s).length;
  const now = new Date(), week = new Date(Date.now() + 7 * 86400_000);
  const interviews = apps.filter((a) => a.status === "INTERVIEW" && a.interviewAt && a.interviewAt >= new Date(now.getTime() - 3600_000) && a.interviewAt <= week).sort((a, b) => a.interviewAt!.getTime() - b.interviewAt!.getTime());
  const open = jobs.filter((j) => j.open);
  const colour = (k: string) => STATUSES.find((s) => s.key === k)?.color ?? "#868e96";

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1 }}><h1 style={{ fontSize: 22, margin: 0 }}>Recruiting</h1><div className="muted">{open.length} open {open.length === 1 ? "role" : "roles"} · {apps.length} {apps.length === 1 ? "candidate" : "candidates"}</div></div>
        <Link href="/app/hire/new" className="btn" style={{ width: "auto", padding: "8px 14px" }}>＋ Post a role</Link>
      </div>

      <div className="stat" style={{ marginTop: 10 }}>
        <div className="card"><b>{count("NEW")}</b><span className="muted">new</span></div>
        <div className="card"><b>{count("SHORTLISTED") + count("INTERVIEW")}</b><span className="muted">in progress</span></div>
        <div className="card"><b>{count("OFFER") + count("HIRED")}</b><span className="muted">offers & hires</span></div>
      </div>

      {(count("NEW") > 0 || interviews.length > 0) && (
        <section className="card" aria-labelledby="att">
          <h2 id="att" style={{ fontSize: 15, margin: "0 0 6px" }}>Needs your attention</h2>
          {count("NEW") > 0 && <div style={{ padding: "4px 0" }}><b>{count("NEW")}</b> new {count("NEW") === 1 ? "candidate is" : "candidates are"} waiting for a decision</div>}
          {interviews.slice(0, 4).map((a) => (
            <Link key={a.id} href={`/app/hire/candidate/${a.id}`} style={{ display: "flex", gap: 8, padding: "6px 0", borderTop: "1px solid var(--line)", color: "inherit" }}>
              <span aria-hidden></span><span style={{ flex: 1 }}><b>{a.name}</b><span className="muted" style={{ display: "block" }}>{a.jobTitle}</span></span><span className="muted">{day(a.interviewAt!)}, {time(a.interviewAt!)}</span>
            </Link>
          ))}
        </section>
      )}

      <div className="row" style={{ marginBottom: 12 }}>
        <Link href="/app/hire/talent" className="btn ghost">Find talent</Link>
        <Link href="/app/profile/kit?mode=RECRUITER" className="btn ghost">Recruiter page</Link>
      </div>

      <h2 style={{ fontSize: 15, margin: "4px 0 8px" }}>Your roles</h2>
      {jobs.length === 0 && (
        <div className="card" style={{ textAlign: "center" }}>
          <b>No roles yet</b>
          <p className="muted">Post a role and it appears on your Recruiter page. Candidates apply there, and you manage them here.</p>
          <Link href="/app/hire/new" className="btn">Post your first role</Link>
        </div>
      )}
      {jobs.map((j) => {
        const total = j.applications.length;
        const fresh = j.applications.filter((a) => a.status === "NEW").length;
        return (
          <Link key={j.id} href={`/app/hire/${j.id}`} className="card" style={{ display: "block", color: "inherit", opacity: j.open ? 1 : 0.75 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 16 }}>{j.title}</b>
                <div className="muted">{[j.location, j.workType, j.employment].filter(Boolean).join(" · ")}{j.event ? ` · at ${j.event.name}` : ""}</div>
              </div>
              {fresh > 0 && <span className="pill on" style={{ margin: 0 }}>{fresh} new</span>}
              <span className="pill" style={{ margin: 0 }}>{j.open ? "Open" : "Closed"}</span>
            </div>
            <div role="img" aria-label={`${total} candidates: ${PIPELINE.map((k) => `${j.applications.filter((a) => a.status === k).length} ${k.toLowerCase()}`).join(", ")}`} style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "#e0dfdc", margin: "10px 0 6px" }}>
              {PIPELINE.map((k) => { const n = j.applications.filter((a) => a.status === k).length; return n ? <span key={k} style={{ flex: n, background: colour(k) }} /> : null; })}
            </div>
            <div className="muted">{total === 0 ? "No applicants yet" : `${total} applicant${total === 1 ? "" : "s"} · ${j.applications.filter((a) => a.status === "INTERVIEW").length} interviewing · ${j.applications.filter((a) => a.status === "OFFER" || a.status === "HIRED").length} offered or hired`}</div>
          </Link>
        );
      })}
    </>
  );
}

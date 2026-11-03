import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { avatarBg } from "@/lib/avatar-color";
import { STATUSES, PIPELINE, nextStage, statusLabel, skillMatch } from "@/lib/hiring";
import PageHead from "@/components/page-head";
import RoleForm from "@/components/role-form";
import { moveCandidate, saveJob, setJobOpen, removeJob } from "../actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Role" };

const ago = (d: Date) => { const s = (Date.now() - d.getTime()) / 1000; return s < 3600 ? `${Math.max(1, Math.floor(s / 60))}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`; };
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/** One role's pipeline: stage tabs, then the candidates in that stage, each with a one-tap next step. */
export default async function Role({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ stage?: string; saved?: string; err?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const job = await db.job.findFirst({ where: { id, profileId: profile.id }, include: { event: true, applications: { orderBy: { createdAt: "desc" } } } });
  if (!job) notFound();
  const [events, people, interestedEvent] = await Promise.all([
    db.event.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true } }),
    db.profile.findMany({ where: { handle: { in: job.applications.map((a) => a.candidateHandle).filter(Boolean) } }, select: { handle: true, headline: true, skills: true, openTo: true } }),
    db.attendee.count({ where: { event: { profileId: profile.id }, interested: { contains: job.id } } }),
  ]);
  const stage = (STATUSES.map((s) => s.key) as string[]).includes(sp.stage ?? "") ? sp.stage! : "ALL";
  const count = (k: string) => job.applications.filter((a) => a.status === k).length;
  const list = job.applications.filter((a) => (stage === "ALL" ? a.status !== "REJECTED" : a.status === stage));
  const here = `/app/hire/${job.id}${sp.stage ? `?stage=${sp.stage}` : ""}`;
  const mail = (a: { name: string; email: string }) => `mailto:${a.email}?subject=${encodeURIComponent("Your application: " + job.title)}&body=${encodeURIComponent(`Hi ${a.name.split(" ")[0]},\n\nThank you for applying for ${job.title}.`)}`;

  return (
    <>
      <PageHead title={job.title} sub={[job.open ? "Open" : "Closed", job.location, job.workType, job.employment, job.salary].filter(Boolean).join(" · ")} back="/app/hire" saved={!!sp.saved} error={sp.err ? "Give the role a title." : undefined} />

      <div className="row" style={{ marginBottom: 10 }}>
        <Link className="btn ghost" href={`/app/hire/talent?job=${job.id}`}>Talent</Link>
        <a className="btn ghost" href={`/${profile.handle}/apply/${job.id}`} target="_blank" rel="noopener noreferrer">Posting ↗</a>
      </div>

      <nav className="chips" aria-label="Pipeline stage" style={{ overflowX: "auto", flexWrap: "nowrap", margin: "0 0 10px" }}>
        <Link href={`/app/hire/${job.id}`} aria-current={stage === "ALL" ? "page" : undefined} className={"pill" + (stage === "ALL" ? " on" : "")} style={{ whiteSpace: "nowrap" }}>Active {job.applications.length - count("REJECTED")}</Link>
        {STATUSES.map((s) => <Link key={s.key} href={`/app/hire/${job.id}?stage=${s.key}`} aria-current={stage === s.key ? "page" : undefined} className={"pill" + (stage === s.key ? " on" : "")} style={{ whiteSpace: "nowrap" }}>{s.label} {count(s.key)}</Link>)}
      </nav>

      {list.length === 0 && <div className="card muted">{job.applications.length === 0 ? "No applicants yet. Share your Recruiter page or invite people from Find talent." : "Nobody in this stage."}</div>}
      {list.map((a) => {
        const p = people.find((x) => x.handle === a.candidateHandle);
        const m = p && job.skills ? skillMatch(job.skills, p.skills) : null;
        const nx = nextStage(a.status);
        return (
          <article className="card" key={a.id} style={{ padding: 12 }}>
            <Link href={`/app/hire/candidate/${a.id}`} style={{ display: "flex", gap: 10, color: "inherit" }}>
              <span className="av" style={{ background: avatarBg(a.email) }} aria-hidden>{initials(a.name)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{a.name}</b>
                <span className="muted" style={{ display: "block" }}>{p?.headline || a.email}</span>
                <span className="muted" style={{ display: "block" }}>Applied {ago(a.createdAt)} ago · {a.candidateHandle ? "Hire me profile" : a.eventId ? "From an event" : "Application form"}</span>
                <span style={{ display: "block", marginTop: 4 }}>
                  <span className="pill" style={{ margin: "0 4px 0 0" }}>{statusLabel(a.status)}</span>
                  {m && m.total > 0 && <span className="pill" style={{ margin: "0 4px 0 0" }}>{m.hit}/{m.total} skills</span>}
                  {p?.openTo && <span className="pill" style={{ margin: "0 4px 0 0" }}>{p.openTo}</span>}
                  {a.rating > 0 && <span aria-label={`${a.rating} out of 5`} style={{ color: "#8a5a00" }}>{"★".repeat(a.rating)}<span style={{ color: "#c7c7c7" }}>{"★".repeat(5 - a.rating)}</span></span>}
                  {a.interviewAt && <span className="pill" style={{ margin: "0 4px 0 0" }}>{a.interviewAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                </span>
              </span>
            </Link>
            {nx && a.status !== "REJECTED" && <form action={moveCandidate} style={{ marginTop: 8 }}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value={nx} /><input type="hidden" name="back" value={here} /><button aria-label={`Move to ${statusLabel(nx)}: ${a.name}`}>Move to {statusLabel(nx)}</button></form>}
            <div className="row" style={{ marginTop: 6 }}>
              <a className="btn ghost sm" href={mail(a)} style={{ minHeight: 36, padding: "8px 12px" }}>Email</a>
              {a.status !== "REJECTED" && a.status !== "HIRED" && <form action={moveCandidate}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="REJECTED" /><input type="hidden" name="back" value={here} /><button className="ghost sm" style={{ width: "100%" }} aria-label={`Reject ${a.name}`}>Reject</button></form>}
              {a.status === "REJECTED" && <form action={moveCandidate}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="NEW" /><input type="hidden" name="back" value={here} /><button className="ghost sm" style={{ width: "100%" }}>Reconsider</button></form>}
            </div>
          </article>
        );
      })}
      {interestedEvent > 0 && <p className="muted">{interestedEvent} {interestedEvent === 1 ? "person" : "people"} showed interest in this role at your event. <Link href={`/app/events`}>See events</Link></p>}

      <details className="card" style={{ marginTop: 12 }}>
        <summary>Edit this role</summary>
        <div style={{ marginTop: 8 }}><RoleForm action={saveJob} job={{ ...job, eventId: job.eventId }} events={events} submit="Save changes" /></div>
        <div className="row">
          <form action={setJobOpen}><input type="hidden" name="id" value={job.id} /><input type="hidden" name="open" value={job.open ? "0" : "1"} /><button className="ghost">{job.open ? "Close this role" : "Reopen this role"}</button></form>
          <form action={removeJob}><input type="hidden" name="id" value={job.id} /><button className="ghost" style={{ color: "#a61b1b", borderColor: "#a61b1b" }}>Delete role</button></form>
        </div>
      </details>
      <span className="sr-only">{PIPELINE.length} stages</span>
    </>
  );
}

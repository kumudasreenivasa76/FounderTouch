import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { avatarBg } from "@/lib/avatar-color";
import { STATUSES, PIPELINE, statusLabel, skillMatch, nextStage } from "@/lib/hiring";
import { listItems } from "@/lib/modes";
import PageHead from "@/components/page-head";
import { moveCandidate, rateCandidate, saveCandidateNotes, scheduleInterview } from "../../actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Candidate" };

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const local = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

/** One candidate: contact them, rate them, schedule the interview, decide. */
export default async function Candidate({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const a = await db.application.findFirst({ where: { id, profileId: profile.id }, include: { job: true } });
  if (!a) notFound();
  const cand = a.candidateHandle ? await db.profile.findUnique({ where: { handle: a.candidateHandle }, include: { career: { orderBy: { start: "desc" } } } }) : null;
  const m = cand && a.job.skills ? skillMatch(a.job.skills, cand.skills) : null;
  const here = `/app/hire/candidate/${a.id}`;
  const stepIdx = PIPELINE.indexOf(a.status as (typeof PIPELINE)[number]);
  const invite = `Hi ${a.name.split(" ")[0]},\n\nWe'd like to invite you to an interview for ${a.job.title}${a.interviewAt ? ` on ${a.interviewAt.toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}` : ""}.\n\nPlease reply to confirm.\n\n${profile.name}`;

  return (
    <>
      <PageHead title={a.name} sub={`Applied for ${a.job.title}`} back={`/app/hire/${a.jobId}`} saved={!!sp.saved} />

      <div className="card" style={{ textAlign: "center" }}>
        <span className="av lg" style={{ background: avatarBg(a.email), margin: "0 auto 8px" }} aria-hidden>{initials(a.name)}</span>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{a.name}</div>
        <div className="muted">{cand?.headline || a.email}</div>
        {m && m.total > 0 && <div style={{ marginTop: 4 }}><span className="pill">{m.hit} of {m.total} skills match</span>{cand?.openTo && <span className="pill">{cand.openTo}</span>}</div>}
        <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
          <a className="btn" href={`mailto:${a.email}?subject=${encodeURIComponent(a.job.title)}`}>Email</a>
          {a.phone && <a className="btn ghost" href={`tel:${a.phone.replace(/\s+/g, "")}`}>Call</a>}
          {a.linkedin && <a className="btn ghost" href={a.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
          {a.resumeFile && <a className="btn ghost" href={`/applicant-file/${a.id}`} target="_blank" rel="noopener noreferrer">Resume</a>}
          {!a.resumeFile && a.resumeUrl && <a className="btn ghost" href={a.resumeUrl} target="_blank" rel="noopener noreferrer">Resume link</a>}
          {cand && <a className="btn ghost" href={`/${cand.handle}?mode=HIRE`} target="_blank" rel="noopener noreferrer">Hire me profile</a>}
        </div>
      </div>

      <section className="card" aria-labelledby="stg">
        <h2 id="stg" style={{ fontSize: 15, margin: "0 0 8px" }}>Stage: {statusLabel(a.status)}</h2>
        <ol style={{ display: "flex", listStyle: "none", padding: 0, margin: "0 0 10px", gap: 4 }} aria-label="Hiring pipeline">
          {PIPELINE.map((k, i) => { const done = stepIdx >= 0 && i <= stepIdx; const c = STATUSES.find((s) => s.key === k)!.color; return (
            <li key={k} style={{ flex: 1, textAlign: "center", fontSize: 12 }} aria-current={a.status === k ? "step" : undefined}>
              <div style={{ height: 6, borderRadius: 3, background: done ? c : "#e0dfdc", marginBottom: 4 }} />
              <span className="muted" style={{ fontWeight: a.status === k ? 700 : 400, color: a.status === k ? "#191919" : undefined }}>{statusLabel(k)}</span>
            </li>); })}
        </ol>
        <form action={moveCandidate} className="row" style={{ alignItems: "center" }}>
          <input type="hidden" name="id" value={a.id} /><input type="hidden" name="back" value={here} />
          <label className="sr-only" htmlFor="stg-sel">Move to stage</label>
          <select id="stg-sel" name="status" defaultValue={nextStage(a.status) ?? "REJECTED"} style={{ margin: 0 }}>
            {STATUSES.filter((s) => s.key !== a.status).map((s) => <option key={s.key} value={s.key}>{s.key === "REJECTED" ? "Rejected" : `Move to ${s.label}`}</option>)}
          </select>
          <button style={{ flex: "none", width: "auto", padding: "0 20px" }}>Update</button>
        </form>
      </section>

      <section className="card" aria-labelledby="rt">
        <h2 id="rt" style={{ fontSize: 15, margin: "0 0 6px" }}>Your rating</h2>
        <div style={{ display: "flex", gap: 2 }} role="group" aria-label="Rate this candidate">
          {[1, 2, 3, 4, 5].map((n) => (
            <form key={n} action={rateCandidate}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="rating" value={n} />
              <button className="ghost" aria-label={`${n} star${n === 1 ? "" : "s"}`} aria-pressed={a.rating >= n} style={{ border: 0, background: "none", fontSize: 28, minWidth: 44, color: a.rating >= n ? "#8a5a00" : "#8c8c8c" }}>{a.rating >= n ? "★" : "☆"}</button></form>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="iv">
        <h2 id="iv" style={{ fontSize: 15, margin: "0 0 6px" }}>Interview</h2>
        {a.interviewAt && <p style={{ margin: "0 0 8px" }}><b>{a.interviewAt.toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}</b></p>}
        <form action={scheduleInterview} className="row" style={{ alignItems: "center" }}>
          <input type="hidden" name="id" value={a.id} />
          <input type="datetime-local" name="when" defaultValue={local(a.interviewAt)} aria-label="Interview date and time" />
          <button style={{ width: "auto" }}>{a.interviewAt ? "Reschedule" : "Schedule"}</button>
        </form>
        {a.interviewAt && <a className="btn ghost" style={{ marginTop: 8 }} href={`mailto:${a.email}?subject=${encodeURIComponent("Interview: " + a.job.title)}&body=${encodeURIComponent(invite)}`}>Email the invite</a>}
      </section>

      <form action={saveCandidateNotes} className="card">
        <input type="hidden" name="id" value={a.id} />
        <h2 style={{ fontSize: 15, margin: "0 0 6px" }}>Private notes</h2>
        <label className="sr-only" htmlFor="cn">Notes about {a.name}</label>
        <textarea id="cn" name="notes" rows={4} maxLength={2000} defaultValue={a.notes} placeholder="Strengths, concerns, what to ask next. Only you see this." />
        <button>Save notes</button>
      </form>

      {a.note && <div className="card"><h2 style={{ fontSize: 15, margin: "0 0 6px" }}>Their message</h2><p style={{ whiteSpace: "pre-wrap", margin: 0, overflowWrap: "anywhere" }}>{a.note}</p></div>}

      {cand && (
        <section className="card" aria-labelledby="bg">
          <h2 id="bg" style={{ fontSize: 15, margin: "0 0 6px" }}>Background</h2>
          {cand.skills && <div style={{ marginBottom: 6 }}>{listItems(cand.skills).slice(0, 12).map((s) => <span key={s} className="pill">{s}</span>)}</div>}
          {cand.career.slice(0, 5).map((c) => <div key={c.id} style={{ padding: "4px 0", borderTop: "1px solid var(--line)" }}><b>{c.title}</b> <span className="muted">· {c.org}{c.start ? ` · ${c.start}${c.end ? " to " + c.end : " to present"}` : ""}</span></div>)}
          {cand.career.length === 0 && !cand.skills && <span className="muted">No experience listed yet.</span>}
        </section>
      )}
      <Link href={`/app/hire/${a.jobId}`} className="muted">← Back to {a.job.title}</Link>
    </>
  );
}

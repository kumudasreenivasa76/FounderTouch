import PageHead from "@/components/page-head";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, ACCESS_DAYS, MODE_ACCESS_DAYS } from "@/lib/db";
import { MODE_INFO, Mode, listItems } from "@/lib/modes";
import { STATUSES } from "@/lib/hiring";
import { saveContactNote, decideConnection, revokeAccess, addContact } from "../actions";
import { setApplicantStatus, deleteApplicant } from "../../profile/job-actions";
import { requireOwner } from "@/lib/auth";
import CopyButton from "@/components/copy-button";
export const dynamic = "force-dynamic";
export const metadata = { title: "Inbox" };

async function decide(fd: FormData) {
  "use server";
  const { profile } = await requireOwner();
  const status = String(fd.get("status"));
  if (status !== "APPROVED" && status !== "DECLINED") return;
  await db.deckRequest.updateMany({ where: { id: String(fd.get("id")), profileId: profile.id }, data: { status, decidedAt: new Date() } });
  revalidatePath("/app/contacts");
}

async function decideMode(fd: FormData) {
  "use server";
  const { profile } = await requireOwner();
  const status = String(fd.get("status"));
  if (status !== "APPROVED" && status !== "DECLINED") return;
  await db.modeRequest.updateMany({ where: { id: String(fd.get("id")), profileId: profile.id }, data: { status, decidedAt: new Date() } });
  revalidatePath("/app/contacts");
}

export default async function Inbox({ searchParams }: { searchParams: Promise<{ job?: string; f?: string; tag?: string; q?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const [contacts, requests, modeReqs] = await Promise.all([
    db.contact.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" } }),
    db.deckRequest.findMany({ where: { profileId: profile.id }, include: { resource: true }, orderBy: { createdAt: "desc" } }),
    db.modeRequest.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const weekAgo = Date.now() - 7 * 86400_000;
  const f = sp.f ?? "all";
  const q = (sp.q ?? "").trim().toLowerCase();
  const allTags = [...new Set(contacts.flatMap((c) => c.tags.split(",").filter(Boolean)))].sort();
  const shownPeople = contacts.filter((c) => (!sp.tag || c.tags.split(",").includes(sp.tag)) && (!q || `${c.name} ${c.company} ${c.email}`.toLowerCase().includes(q)) && (f === "pending" ? c.status === "PENDING" : c.status === "CONNECTED") && (f === "new" ? c.createdAt.getTime() > weekAgo : f === "followup" ? !!c.followUpAt : f === "event" ? c.source === "event" : true));
  const mPending = modeReqs.filter((r) => r.status === "PENDING");
  const mApproved = modeReqs.filter((r) => r.status === "APPROVED");
  const applicants = await db.application.findMany({ where: { profileId: profile.id }, include: { job: true }, orderBy: { createdAt: "desc" } });
  const candidates = await db.profile.findMany({ where: { handle: { in: applicants.map((a) => a.candidateHandle).filter(Boolean) } }, include: { career: true } });
  const invites = await db.invite.findMany({ where: { candidateProfileId: profile.id }, include: { job: { include: { profile: true } } }, orderBy: { createdAt: "desc" } });
  const newCount = applicants.filter((a) => a.status === "NEW").length;
  const jobList = [...new Map(applicants.map((a) => [a.jobId, a.job.title])).entries()];
  const shown = sp.job ? applicants.filter((a) => a.jobId === sp.job) : applicants;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const pending = requests.filter((r) => r.status === "PENDING");
  const approved = requests.filter((r) => r.status === "APPROVED");

  return (
    <>
      <PageHead title="Inbox" back="/app/contacts" />
      <nav className="d-tabs" aria-label="Jump to">
        <a href="#in-req">Requests</a><a href="#in-access">Access</a><a href="#in-jobs">Jobs</a>
      </nav>

      {contacts.some((c) => c.status === "PENDING") && (
        <>
          <h2 className="d-cap" id="in-req">Connection requests <span className="d-badge badge">{contacts.filter((c) => c.status === "PENDING").length}</span></h2>
          {contacts.filter((c) => c.status === "PENDING").map((c) => (
            <div className="d-card" key={c.id}>
              <span className="d-t1">{c.name}</span>
              <span className="d-t2">Wants to connect · {c.mode.toLowerCase()}{c.company ? ` · ${c.company}` : ""}</span>
              <form action={decideConnection} className="d-btns">
                <input type="hidden" name="id" value={c.id} />
                <button name="choice" value="BLOCK" className="ghost sm">Block</button>
                <button name="choice" value="DECLINE" className="ghost sm">Decline</button>
                <button name="choice" value="ACCEPT" className="sm">Accept</button>
              </form>
            </div>
          ))}
        </>
      )}


      {invites.length > 0 && (
        <>
          <h2 className="d-cap" id="in-jobs">Job invites ({invites.length})</h2>
          {invites.map((i) => (
            <div className="d-card" key={i.id}>
              <b>{i.job.profile.company || i.job.profile.name}</b> invited you to apply
              <div style={{ fontSize: 16, fontWeight: 600 }}>{i.job.title}</div>
              <div className="muted">{[i.job.location, i.job.workType, i.job.employment, i.job.salary].filter(Boolean).join(" · ")}</div>
              <a className="btn sm" style={{ marginTop: 10, display: "inline-flex" }} href={`/${i.job.profile.handle}/apply/${i.job.id}`}>View role &amp; apply</a>
            </div>
          ))}
        </>
      )}

      {applicants.length > 0 && (
        <>
          <h2 className="d-cap">Applicants {newCount > 0 && <span className="d-badge badge">{newCount} new</span>}</h2>
          {jobList.length > 1 && (
            <div className="d-chips">
              <a href="/app/contacts/inbox" className={!sp.job ? "on" : ""}>All roles</a>
              {jobList.map(([id, title]) => <a key={id} href={`/app/contacts/inbox?job=${id}`} className={sp.job === id ? "on" : ""}>{title}</a>)}
            </div>
          )}
          {shown.map((a) => {
            const c = candidates.find((x) => x.handle === a.candidateHandle);
            const last = c?.career.filter((x) => x.type === "EXPERIENCE").sort((x, y) => (y.start || "").localeCompare(x.start || ""))[0];
            const st = STATUSES.find((x) => x.key === a.status);
            return (
              <div className="d-card" key={a.id} style={{ opacity: a.status === "REJECTED" ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}><b>{a.name}</b> <span className="muted">for</span> <b>{a.job.title}</b></div>
                  <span className="d-chip" style={{ flexShrink: 0, background: st?.color, color: "#ffffff" }}>{st?.label}</span>
                </div>
                <div className="muted">{a.email}{a.phone ? ` · ${a.phone}` : ""} · {a.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}</div>
                {c && (
                  <div style={{ margin: "6px 0" }}>
                    <span className="d-chip" style={{ margin: "0 6px 6px 0" }}>TapNodd profile</span>
                    {c.openTo && <span className="d-chip g" style={{ margin: "0 6px 6px 0" }}>{c.openTo}</span>}
                    {last && <span className="d-chip n" style={{ margin: "0 6px 6px 0" }}>{last.title}, {last.org}</span>}
                    {listItems(c.skills).slice(0, 4).map((x) => <span key={x} className="d-chip n" style={{ margin: "0 6px 6px 0" }}>{x}</span>)}
                  </div>
                )}
                {a.note && <div style={{ margin: "6px 0" }}>&ldquo;{a.note}&rdquo;</div>}
                <div className="d-chips" style={{ margin: "8px 0", flexWrap: "wrap" }}>
                  {c && <a href={`/${c.handle}?mode=ALL&pane=hire`} target="_blank">View profile</a>}
                  {a.resumeFile && <a href={`/applicant-file/${a.id}`} target="_blank">Resume</a>}
                  {a.resumeUrl && <a href={a.resumeUrl} target="_blank" rel="noopener noreferrer">Resume link</a>}
                  {a.linkedin && <a href={a.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
                  <a href={`mailto:${a.email}?subject=${encodeURIComponent("Your application: " + a.job.title)}`}>Email</a>
                </div>
                <form action={setApplicantStatus} className="d-stage" aria-label="Stage">
                  <input type="hidden" name="id" value={a.id} />
                  {STATUSES.map((x) => <button key={x.key} name="status" value={x.key} aria-pressed={a.status === x.key} style={a.status === x.key ? { background: x.color, borderColor: x.color, color: "#fff" } : undefined}>{x.label}</button>)}
                </form>
              </div>
            );
          })}
        </>
      )}

      {(mPending.length > 0 || mApproved.length > 0) && (
        <>
          <h2 className="d-cap" id="in-access">Page access {mPending.length > 0 && <span className="d-badge badge">{mPending.length}</span>}</h2>
          {mPending.map((r) => (
            <div className="d-card" key={r.id}>
              <b>{r.name}</b> <span className="muted">wants to view your</span> <b>{MODE_INFO[r.mode as Mode]?.label ?? r.mode}</b> <span className="muted">page</span>
              <div className="muted">{r.email}</div>
              {r.note && <div style={{ marginTop: 4 }}>"{r.note}"</div>}
              <form action={decideMode} className="d-btns">
                <input type="hidden" name="id" value={r.id} />
                <button name="status" value="DECLINED" className="ghost sm">Decline</button>
                <button name="status" value="APPROVED" className="sm">Approve</button>
              </form>
            </div>
          ))}
          {mApproved.map((r) => {
            const url = `${origin}/a/${r.token}`;
            const expired = !r.decidedAt || Date.now() - r.decidedAt.getTime() > MODE_ACCESS_DAYS * 86400_000;
            const body = encodeURIComponent(`Hi ${r.name.split(" ")[0]},

You can view my ${MODE_INFO[r.mode as Mode]?.label ?? r.mode} page here (valid ${MODE_ACCESS_DAYS} days):
${url}

${profile.name}`);
            return (
              <div className="d-card" key={r.id}>
                <b>{r.name}</b> · {MODE_INFO[r.mode as Mode]?.label ?? r.mode} <span className="d-chip g">Approved</span> {expired && <span className="d-chip n">Expired</span>}
                <form action={revokeAccess} style={{ float: "right" }}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="kind" value="mode" /><button className="ghost sm">Revoke</button></form>
                {!expired && (
                  <>
                    <input readOnly value={url} style={{ marginTop: 8 }} />
                    <div className="row">
                      <CopyButton label="Copy link" text={url} />
                      <a className="btn ghost sm" href={`mailto:${r.email}?subject=${encodeURIComponent("Your access link")}&body=${body}`}>Email it</a>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </>
      )}

      {pending.length > 0 && (
        <>
          <h2 className="d-cap">File requests <span className="d-badge badge">{pending.length}</span></h2>
          {pending.map((r) => (
            <div className="d-card" key={r.id}>
              <b>{r.name}</b> <span className="muted">wants</span> <b>{r.resource.title}</b>
              <div className="muted">{r.email}</div>
              <form action={decide} className="d-btns">
                <input type="hidden" name="id" value={r.id} />
                <button name="status" value="DECLINED" className="ghost sm">Decline</button>
                <button name="status" value="APPROVED" className="sm">Approve</button>
              </form>
            </div>
          ))}
        </>
      )}

      {approved.length > 0 && (
        <>
          <h2 className="d-cap">Approved</h2>
          {approved.map((r) => {
            const url = `${origin}/files/${r.resourceId}?t=${r.token}`;
            const expired = !r.decidedAt || Date.now() - r.decidedAt.getTime() > ACCESS_DAYS * 86400_000;
            const body = encodeURIComponent(`Hi ${r.name},\n\nHere is private access to "${r.resource.title}" (valid for ${ACCESS_DAYS} days):\n${url}\n\n${profile.name}`);
            return (
              <div className="d-card" key={r.id}>
                <form action={revokeAccess} style={{ float: "right" }}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="kind" value="file" /><button className="ghost sm">Revoke</button></form>
                <b>{r.name}</b> · {r.resource.title} {expired && <span className="d-chip n">Expired</span>}
                {!expired && (
                  <>
                    <input readOnly value={url} style={{ marginTop: 8 }} />
                    <a className="btn ghost sm" style={{ marginTop: 8, display: "inline-flex" }} href={`mailto:${r.email}?subject=${encodeURIComponent("Your access link")}&body=${body}`}>Email the link</a>
                  </>
                )}
              </div>
            );
          })}
        </>
      )}


    </>
  );
}

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, ACCESS_DAYS, MODE_ACCESS_DAYS } from "@/lib/db";
import { MODE_INFO, Mode, listItems } from "@/lib/modes";
import { STATUSES } from "@/lib/hiring";
import { setApplicantStatus, deleteApplicant } from "../profile/job-actions";
import { requireOwner } from "@/lib/auth";
import CopyButton from "@/components/copy-button";
export const dynamic = "force-dynamic";

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

export default async function Contacts({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const [contacts, requests, modeReqs] = await Promise.all([
    db.contact.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" } }),
    db.deckRequest.findMany({ where: { profileId: profile.id }, include: { resource: true }, orderBy: { createdAt: "desc" } }),
    db.modeRequest.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" } }),
  ]);
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
      <h1>Contacts</h1>

      {invites.length > 0 && (
        <>
          <h2>🎯 Job invites ({invites.length})</h2>
          {invites.map((i) => (
            <div className="card" key={i.id} style={{ borderColor: "#d7defb", background: "#eef1ff" }}>
              <b>{i.job.profile.company || i.job.profile.name}</b> invited you to apply
              <div style={{ fontSize: 16, fontWeight: 600 }}>{i.job.title}</div>
              <div className="muted">{[i.job.location, i.job.workType, i.job.employment, i.job.salary].filter(Boolean).join(" · ")}</div>
              <a className="btn" style={{ marginTop: 8 }} href={`/${i.job.profile.handle}/apply/${i.job.id}`}>View role &amp; apply</a>
            </div>
          ))}
        </>
      )}

      {applicants.length > 0 && (
        <>
          <h2>🎯 Applicants {newCount > 0 && <span className="pill on">{newCount} new</span>}</h2>
          {jobList.length > 1 && (
            <div className="chips" style={{ marginBottom: 8 }}>
              <a href="/app/contacts" className={"pill" + (!sp.job ? " on" : "")}>All roles</a>
              {jobList.map(([id, title]) => <a key={id} href={`/app/contacts?job=${id}`} className={"pill" + (sp.job === id ? " on" : "")}>{title}</a>)}
            </div>
          )}
          {shown.map((a) => {
            const c = candidates.find((x) => x.handle === a.candidateHandle);
            const last = c?.career.filter((x) => x.type === "EXPERIENCE").sort((x, y) => (y.start || "").localeCompare(x.start || ""))[0];
            const st = STATUSES.find((x) => x.key === a.status);
            return (
              <div className="card" key={a.id} style={{ opacity: a.status === "REJECTED" ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}><b>{a.name}</b> <span className="muted">for</span> <b>{a.job.title}</b></div>
                  <span className="pill" style={{ margin: 0, height: "fit-content", background: st?.color, color: "#fff" }}>{st?.label}</span>
                </div>
                <div className="muted">{a.email}{a.phone ? ` · ${a.phone}` : ""} · {a.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}</div>
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
                  {a.linkedin && <a className="btn ghost" href={a.linkedin} target="_blank" rel="noopener noreferrer">in LinkedIn</a>}
                  <a className="btn ghost" href={`mailto:${a.email}?subject=${encodeURIComponent("Your application: " + a.job.title)}`}>✉ Email</a>
                </div>
                <form action={setApplicantStatus} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <input type="hidden" name="id" value={a.id} />
                  {STATUSES.map((x) => <button key={x.key} name="status" value={x.key} className={a.status === x.key ? "" : "ghost"} style={{ width: "auto", padding: "6px 11px", fontSize: 13, background: a.status === x.key ? x.color : undefined }}>{x.label}</button>)}
                </form>
              </div>
            );
          })}
        </>
      )}

      {(mPending.length > 0 || mApproved.length > 0) && (
        <>
          <h2>Page access {mPending.length > 0 && <span className="pill on">{mPending.length}</span>}</h2>
          {mPending.map((r) => (
            <div className="card" key={r.id}>
              <b>{r.name}</b> <span className="muted">wants to view your</span> <b>{MODE_INFO[r.mode as Mode]?.icon} {MODE_INFO[r.mode as Mode]?.label ?? r.mode}</b> <span className="muted">page</span>
              <div className="muted">{r.email}</div>
              {r.note && <div style={{ marginTop: 4 }}>"{r.note}"</div>}
              <form action={decideMode} className="row" style={{ marginTop: 10 }}>
                <input type="hidden" name="id" value={r.id} />
                <button name="status" value="DECLINED" className="ghost">Decline</button>
                <button name="status" value="APPROVED">Approve</button>
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
              <div className="card" key={r.id}>
                <b>{r.name}</b> · {MODE_INFO[r.mode as Mode]?.label ?? r.mode} <span className="pill" style={{ background: "#e6f9ef" }}>approved</span> {expired && <span className="pill">expired</span>}
                {!expired && (
                  <>
                    <input readOnly value={url} style={{ marginTop: 8 }} />
                    <div className="row">
                      <CopyButton label="Copy link" text={url} />
                      <a className="btn ghost" href={`mailto:${r.email}?subject=${encodeURIComponent("Your access link")}&body=${body}`}>✉ Email it</a>
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
          <h2>File requests <span className="pill on">{pending.length}</span></h2>
          {pending.map((r) => (
            <div className="card" key={r.id}>
              <b>{r.name}</b> <span className="muted">wants</span> <b>{r.resource.title}</b>
              <div className="muted">{r.email}</div>
              <form action={decide} className="row" style={{ marginTop: 10 }}>
                <input type="hidden" name="id" value={r.id} />
                <button name="status" value="DECLINED" className="ghost">Decline</button>
                <button name="status" value="APPROVED">Approve</button>
              </form>
            </div>
          ))}
        </>
      )}

      {approved.length > 0 && (
        <>
          <h2>Approved</h2>
          {approved.map((r) => {
            const url = `${origin}/files/${r.resourceId}?t=${r.token}`;
            const expired = !r.decidedAt || Date.now() - r.decidedAt.getTime() > ACCESS_DAYS * 86400_000;
            const body = encodeURIComponent(`Hi ${r.name},\n\nHere is private access to "${r.resource.title}" (valid for ${ACCESS_DAYS} days):\n${url}\n\n${profile.name}`);
            return (
              <div className="card" key={r.id}>
                <b>{r.name}</b> · {r.resource.title} {expired && <span className="pill">expired</span>}
                {!expired && (
                  <>
                    <input readOnly value={url} style={{ marginTop: 8 }} />
                    <a className="btn ghost" href={`mailto:${r.email}?subject=${encodeURIComponent("Your access link")}&body=${body}`}>✉ Email the link</a>
                  </>
                )}
              </div>
            );
          })}
        </>
      )}

      <h2>People</h2>
      <p className="muted">{contacts.length} people shared their details with you</p>
      {contacts.length === 0 && <div className="card muted">Nobody yet. Share your QR and people who send their details will show up here.</div>}
      {contacts.map((c) => (
        <div className="card" key={c.id}>
          <b>{c.name}</b> <span className="pill" style={{ float: "right", margin: 0 }}>{c.mode.toLowerCase()}</span>
          <div className="muted">{c.company ? c.company + " · " : ""}<a href={`mailto:${c.email}`}>{c.email}</a></div>
          <div className="row" style={{ marginTop: 10 }}>
            <a className="btn ghost" target="_blank" rel="noopener noreferrer"
              href={c.linkedin || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent((c.name + " " + c.company).trim())}`}>
              in {c.linkedin ? "Open LinkedIn" : "Find on LinkedIn"}
            </a>
            <CopyButton label="Copy note" text={`Hi ${c.name.split(" ")[0]}, great meeting you${c.company ? " and hearing about " + c.company : ""}. Let's stay in touch! ${profile.name}`} />
          </div>
        </div>
      ))}
    </>
  );
}

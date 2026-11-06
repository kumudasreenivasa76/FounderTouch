import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import Kiki from "@/components/kiki";

const STAGES = [
  { key: "all", label: "All" },
  { key: "pending", label: "New requests" },
  { key: "connected", label: "Connected" },
  { key: "due", label: "Follow-up due" },
  { key: "starred", label: "Starred" },
] as const;
const APP_COLS = ["NEW", "SHORTLISTED", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

/** The CRM for one mode: stage counts, search, and a contact table. Recruiter and Hire also show the applicant board. */
export default async function ModeCrm({ params, searchParams }: { params: Promise<{ mode: string }>; searchParams: Promise<{ stage?: string; q?: string; source?: string }> }) {
  const { mode: raw } = await params;
  const sp = await searchParams;
  const mode = raw.toUpperCase() as Mode;
  if (!MODES.includes(mode)) notFound();
  const { profile } = await requireOwner();
  const pid = profile.id, info = MODE_INFO[mode];
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  // "All" shows every mode; any other mode shows only its own contacts.
  const base = { profileId: pid, status: { not: "BLOCKED" }, ...(mode === "ALL" ? {} : { mode }) };
  const stage = STAGES.some((s) => s.key === sp.stage) ? sp.stage! : "all";
  const where = {
    ...base,
    ...(stage === "pending" ? { status: "PENDING" } : stage === "connected" ? { status: "CONNECTED" } : stage === "due" ? { status: "CONNECTED", followUpAt: { lte: endOfToday } } : stage === "starred" ? { starred: true } : {}),
    ...(sp.source ? { source: sp.source } : {}),
    ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { email: { contains: sp.q } }, { company: { contains: sp.q } }, { tags: { contains: sp.q.toLowerCase() } }] } : {}),
  };
  const [counts, rows, apps] = await Promise.all([
    Promise.all([
      db.contact.count({ where: base }),
      db.contact.count({ where: { ...base, status: "PENDING" } }),
      db.contact.count({ where: { ...base, status: "CONNECTED" } }),
      db.contact.count({ where: { ...base, status: "CONNECTED", followUpAt: { lte: endOfToday } } }),
      db.contact.count({ where: { ...base, starred: true } }),
    ]),
    db.contact.findMany({ where, orderBy: [{ starred: "desc" }, { lastInteractionAt: "desc" }], take: 200 }),
    mode === "RECRUITER" || mode === "HIRE" ? db.application.findMany({ where: { profileId: pid }, orderBy: { createdAt: "desc" }, include: { job: { select: { title: true } } }, take: 300 }) : Promise.resolve([]),
  ]);
  const href = (s: string) => `/dashboard/${raw}?stage=${s}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`;
  const d = (x: Date | null) => (x ? x.toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—");
  const pill = (s: string) => <span className={"pill " + (s === "CONNECTED" ? "ok" : s === "PENDING" ? "wait" : "bad")}>{s === "PENDING" ? "New" : s === "CONNECTED" ? "Connected" : s}</span>;

  return (
    <>
      <h2>{mode === "ALL" ? "Contacts" : `${info.label} · CRM`}</h2>
      <div className="dash-sub">{info.blurb}. People who reached you through this {mode === "ALL" ? "card" : "mode"}.</div>

      <div className="stages">
        {STAGES.map((s, i) => (
          <Link key={s.key} href={href(s.key)} className={"stage" + (stage === s.key ? " on" : "")}><b>{counts[i]}</b><span className="muted2">{s.label}</span></Link>
        ))}
      </div>

      {apps.length > 0 && (
        <>
          <h3 style={{ margin: "6px 0 8px" }}>Applicants</h3>
          <div className="board">
            {APP_COLS.map((c) => { const list = apps.filter((a) => a.status === c); return (
              <div key={c} className="col"><h4>{c.toLowerCase()} · {list.length}</h4>
                {list.slice(0, 8).map((a) => <div key={a.id} className="c"><b>{a.name}</b><div className="muted2">{a.job.title}</div></div>)}
                {list.length > 8 && <div className="muted2">+{list.length - 8} more</div>}
              </div>); })}
          </div>
        </>
      )}

      <form className="filters" action={`/dashboard/${raw}`}>
        <input type="hidden" name="stage" value={stage} />
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name, email, company, tag" aria-label="Search" />
        <select name="source" defaultValue={sp.source ?? ""} aria-label="Source">
          <option value="">Any source</option>
          {["qr", "nfc", "event", "manual", "link"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit">Filter</button>
        <Link href="/app/contacts/new" className="btn ghost" style={{ marginLeft: "auto", padding: "8px 14px" }}>+ Add contact</Link>
        <a href="/app/contacts/import" className="btn ghost" style={{ padding: "8px 14px" }}>Import</a>
        <a href="/app/contacts/export?format=csv" className="btn ghost" style={{ padding: "8px 14px" }}>Export CSV</a>
        <a href="/app/contacts/export?format=vcf" className="btn ghost" style={{ padding: "8px 14px" }}>vCard</a>
      </form>

      {rows.length === 0 ? (
        <div className="empty">
          <Kiki pose="sleepy" width={180} style={{ display: "block", margin: "0 auto 8px" }} />
          Nothing here yet. Share your {info.label} card to start collecting contacts.
        </div>
      ) : (
        <table className="crm">
          <thead><tr><th>Name</th><th>Company</th>{mode === "ALL" && <th>Mode</th>}<th>Status</th><th>Source</th><th>Last contact</th><th>Follow-up</th><th>Tags</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/app/contacts/${c.id}`}><b>{c.starred ? "★ " : ""}{c.name}</b></Link><div className="muted2">{c.email}</div></td>
                <td>{c.company || "—"}<div className="muted2">{c.jobTitle}</div></td>
                {mode === "ALL" && <td>{MODE_INFO[c.mode as Mode]?.label ?? c.mode}</td>}
                <td>{pill(c.status)}</td>
                <td style={{ textTransform: "capitalize" }}>{c.source}{c.metAt ? <div className="muted2">{c.metAt}</div> : null}</td>
                <td>{d(c.lastInteractionAt)}<div className="muted2">{c.interactions}× seen</div></td>
                <td>{c.followUpAt && c.followUpAt <= endOfToday ? <span className="pill wait">{d(c.followUpAt)}</span> : d(c.followUpAt)}</td>
                <td>{c.tags ? c.tags.split(",").filter(Boolean).map((t) => <span key={t} className="pill" style={{ marginRight: 4 }}>{t}</span>) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

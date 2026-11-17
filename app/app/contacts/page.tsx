import Link from "next/link";
import Icon from "@/components/icon";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { avatarBg } from "@/lib/avatar-color";
import { MODE_INFO, Mode } from "@/lib/modes";
import { decideConnection, toggleStar, markFollowedUp, setFollowUp } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Connections" };

type Filter = "all" | "starred" | "new" | "followup" | "event";
// Event attendees and job applicants have their own tabs, so they are not offered as a filter here.
const FILTERS: [Filter, string][] = [["all", "All"], ["starred", "Starred"], ["new", "New"], ["followup", "Follow-up"]];
type View = "people" | "events" | "jobs";
const SORTS: [string, string][] = [["recent", "Recently added"], ["active", "Recently active"], ["name", "Name A to Z"], ["company", "Company"], ["followup", "Next follow-up"]];
const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const SOURCE: Record<string, string> = { job: "Job application", email: "Email signature", qr: "QR scan", nfc: "NFC tap", link: "Link", event: "Event", manual: "Added by hand", import: "Imported", team: "Team" };

/** Your connections: who needs a follow-up, then everyone, searchable, filterable and sortable. */
export default async function Connections({ searchParams }: { searchParams: Promise<{ f?: string; tag?: string; q?: string; sort?: string; v?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const f: Filter = (FILTERS.map(([k]) => k) as string[]).includes(sp.f ?? "") ? (sp.f as Filter) : "all";
  const q = (sp.q ?? "").trim().toLowerCase();
  const sort = SORTS.some(([k]) => k === sp.sort) ? sp.sort! : "recent";
  const [all, inboxCount] = await Promise.all([
    db.contact.findMany({ where: { profileId: profile.id, status: { in: ["CONNECTED", "PENDING"] } } }),
    Promise.all([
      db.modeRequest.count({ where: { profileId: profile.id, status: "PENDING" } }),
      db.deckRequest.count({ where: { profileId: profile.id, status: "PENDING" } }),
      db.application.count({ where: { profileId: profile.id, status: "NEW" } }),
    ]).then((n) => n.reduce((a, b) => a + b, 0)),
  ]);
  const pending = all.filter((c) => c.status === "PENDING");
  const connected = all.filter((c) => c.status === "CONNECTED");
  // People who came in through an event or a job posting are kept apart from the people you met yourself.
  const applicants = new Set((await db.application.findMany({ where: { profileId: profile.id }, select: { email: true } })).map((a) => a.email.toLowerCase()));
  const isJob = (c: (typeof all)[number]) => c.source === "job" || applicants.has(c.email.toLowerCase());
  const groups: Record<View, typeof all> = {
    events: connected.filter((c) => c.source === "event" && !isJob(c)),
    jobs: connected.filter(isJob),
    people: connected.filter((c) => c.source !== "event" && !isJob(c)),
  };
  const view: View = sp.v === "events" || sp.v === "jobs" ? sp.v : "people";
  const people = groups[view];
  const noun = view === "events" ? ["event contact", "event contacts"] : view === "jobs" ? ["applicant", "applicants"] : ["person", "people"];
  const now = Date.now(), weekAgo = now - 7 * 86400_000, endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const due = people.filter((c) => c.followUpAt && c.followUpAt.getTime() <= endOfToday.getTime()).sort((a, b) => a.followUpAt!.getTime() - b.followUpAt!.getTime());
  const allTags = [...new Set(people.flatMap((c) => c.tags.split(",").filter(Boolean)))].sort();
  const counts: Record<Filter, number> = {
    all: people.length,
    starred: people.filter((c) => c.starred).length,
    new: people.filter((c) => c.createdAt.getTime() > weekAgo).length,
    followup: people.filter((c) => c.followUpAt).length,
    event: people.filter((c) => c.source === "event").length,
  };

  let list = people.filter((c) =>
    (!sp.tag || c.tags.split(",").includes(sp.tag)) &&
    (!q || `${c.name} ${c.company} ${c.email} ${c.jobTitle} ${c.tags} ${c.metAt}`.toLowerCase().includes(q)) &&
    (f === "all" || (f === "starred" && c.starred) || (f === "new" && c.createdAt.getTime() > weekAgo) || (f === "followup" && !!c.followUpAt) || (f === "event" && c.source === "event")));
  const by: Record<string, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
    recent: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    active: (a, b) => b.lastInteractionAt.getTime() - a.lastInteractionAt.getTime(),
    name: (a, b) => a.name.localeCompare(b.name),
    company: (a, b) => (a.company || "~").localeCompare(b.company || "~") || a.name.localeCompare(b.name),
    followup: (a, b) => (a.followUpAt?.getTime() ?? Infinity) - (b.followUpAt?.getTime() ?? Infinity),
  };
  list = [...list].sort((a, b) => Number(b.starred) - Number(a.starred) || by[sort](a, b)).slice(0, 100);
  const href = (over: Record<string, string>) => { const p = new URLSearchParams({ ...(sp.v ? { v: sp.v } : {}), ...(sp.f ? { f: sp.f } : {}), ...(sp.tag ? { tag: sp.tag } : {}), ...(sp.q ? { q: sp.q } : {}), ...(sp.sort ? { sort: sp.sort } : {}), ...over }); for (const [k, v] of [...p]) if (!v) p.delete(k); const s = p.toString(); return "/app/contacts" + (s ? "?" + s : ""); };
  const here = href({});

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ flex: 1 }}><h1 style={{ fontSize: 22, margin: 0 }}>Connections</h1><div className="muted">{people.length} {people.length === 1 ? noun[0] : noun[1]}{people.filter((c) => c.starred).length ? ` · ${people.filter((c) => c.starred).length} starred` : ""}</div></div>
        <Link href="/app/contacts/import" className="btn ghost" style={{ width: "auto", padding: "8px 14px" }}>Import</Link>
        <Link href="/app/contacts/new" className="btn" style={{ width: "auto", padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="plus" size={15} /> Add</Link>
      </div>

      <nav className="seg cn-seg" aria-label="Which connections">
        {([["people", "People"], ["events", "Events"], ["jobs", "Jobs"]] as [View, string][]).map(([k, l]) => (
          <Link key={k} href={k === "people" ? "/app/contacts" : `/app/contacts?v=${k}`} aria-current={view === k ? "page" : undefined}>{l}<span className="cn-n">{groups[k].length}</span></Link>
        ))}
      </nav>
      {view === "events" && <p className="cn-hint">People who registered for or checked in at your events. <Link href="/app/events">Open Events</Link></p>}
      {view === "jobs" && <p className="cn-hint">People who applied to your open roles. Review and rate them in <Link href="/app/hire">Recruiting</Link>.</p>}

      {(pending.length > 0 || inboxCount > 0) && (
        <Link href="/app/contacts/inbox" className="menu-row" style={{ marginTop: 10 }}>
          <span className="menu-ico" aria-hidden><Icon name="mail" /></span>
          <span style={{ flex: 1 }}><b>Inbox</b><span className="muted" style={{ display: "block" }}>{[pending.length ? `${pending.length} connection request${pending.length === 1 ? "" : "s"}` : "", inboxCount ? `${inboxCount} approval${inboxCount === 1 ? "" : "s"} or applicant${inboxCount === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")}</span></span>
          <span className="pill on" style={{ margin: 0 }}>{pending.length + inboxCount}</span>
        </Link>
      )}

      {pending.slice(0, 2).map((c) => (
        <div className="card" key={c.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="av" style={{ background: avatarBg(c.email) }} aria-hidden>{initials(c.name)}</span>
          <div style={{ flex: 1, minWidth: 0 }}><b>{c.name}</b><div className="muted">{c.company || c.email} · wants to connect</div></div>
          <form action={decideConnection} style={{ display: "flex", gap: 6 }}><input type="hidden" name="id" value={c.id} /><button name="choice" value="DECLINE" className="ghost sm" aria-label={`Ignore ${c.name}`}>Ignore</button><button name="choice" value="ACCEPT" className="sm" aria-label={`Accept ${c.name}`}>Accept</button></form>
        </div>
      ))}

      {due.length > 0 && (
        <section aria-labelledby="due" className="card" style={{ borderColor: "#f5c26b", background: "#fffaf0" }}>
          <h2 id="due" style={{ fontSize: 15, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 7 }}><Icon name="calendar" size={16} /> Follow up today <span className="pill on" style={{ margin: 0 }}>{due.length}</span></h2>
          {due.slice(0, 4).map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid #f0e2c4" }}>
              <Link href={`/app/contacts/${c.id}`} style={{ flex: 1, minWidth: 0, color: "inherit" }}><b>{c.name}</b><span className="muted" style={{ display: "block" }}>{c.followUpAt!.getTime() < Date.now() - 86400_000 ? `Overdue since ${day(c.followUpAt!)}` : "Due today"}</span></Link>
              <form action={setFollowUp}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="days" value="3" /><input type="hidden" name="back" value={here} /><button className="ghost sm" aria-label={`+3d: remind me about ${c.name} in 3 days`}>+3d</button></form>
              <form action={markFollowedUp}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="back" value={here} /><button className="sm" aria-label={`Done: followed up with ${c.name}`}>Done</button></form>
            </div>
          ))}
          {due.length > 4 && <Link href="/app/contacts?f=followup" className="muted">See all {due.length} ›</Link>}
        </section>
      )}

      <form method="get" role="search" style={{ marginTop: 8 }}>
        {sp.v && <input type="hidden" name="v" value={sp.v} />}{sp.f && <input type="hidden" name="f" value={sp.f} />}{sp.tag && <input type="hidden" name="tag" value={sp.tag} />}
        <div style={{ display: "flex", gap: 8 }}>
          <input name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Search name, company, tag, where you met" aria-label="Search connections" style={{ flex: 1, margin: 0 }} />
          <button style={{ flex: "none", width: "auto", padding: "0 20px" }}>Search</button>
        </div>
        <label className="sr-only" htmlFor="sort">Sort by</label>
        <select id="sort" name="sort" defaultValue={sort} style={{ marginTop: 8 }}>{SORTS.map(([k, l]) => <option key={k} value={k}>Sort: {l}</option>)}</select>
      </form>
      <nav className="chips cn-filters" aria-label="Filter connections" style={{ overflowX: "auto", flexWrap: "nowrap", margin: "0 0 8px" }}>
        {FILTERS.map(([k, l]) => <Link key={k} href={href({ f: k === "all" ? "" : k })} aria-current={f === k ? "page" : undefined} className={"pill" + (f === k ? " on" : "")} style={{ whiteSpace: "nowrap" }}>{l}{k !== "all" && counts[k] > 0 ? ` · ${counts[k]}` : ""}</Link>)}
      </nav>
      {allTags.length > 0 && <nav className="chips" aria-label="Filter by tag" style={{ overflowX: "auto", flexWrap: "nowrap", margin: "0 0 10px" }}>{allTags.map((t) => <Link key={t} href={href({ tag: sp.tag === t ? "" : t })} aria-current={sp.tag === t ? "true" : undefined} className={"pill" + (sp.tag === t ? " on" : "")} style={{ whiteSpace: "nowrap" }}>#{t}</Link>)}</nav>}

      {people.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "26px 16px" }}>
          <span style={{ display: "inline-flex", width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,rgba(31,79,216,.12),rgba(61,107,234,.12))", color: "#1f4fd8", alignItems: "center", justifyContent: "center", marginBottom: 10 }} aria-hidden><Icon name="users" size={26} /></span>
          <b style={{ display: "block" }}>{view === "events" ? "No event contacts yet" : view === "jobs" ? "No applicants yet" : "No connections yet"}</b>
          <p className="muted">{view === "events" ? "People who register for or check in at your events appear here." : view === "jobs" ? "People who apply to your open roles appear here." : "Share your card, scan someone else's, or bring in a list you already have."}</p>
          {view === "people"
            ? <div className="row"><Link className="btn" href="/app/card">Share my card</Link><Link className="btn ghost" href="/app/contacts/import">Import a list</Link></div>
            : <Link className="btn" href={view === "events" ? "/app/events" : "/app/hire"}>{view === "events" ? "Open Events" : "Open Recruiting"}</Link>}
        </div>
      )}
      {people.length > 0 && list.length === 0 && <div className="card muted">Nobody matches. <Link href={view === "people" ? "/app/contacts" : `/app/contacts?v=${view}`}>Clear filters</Link></div>}

      {list.map((c) => {
        const overdue = c.followUpAt && c.followUpAt.getTime() <= endOfToday.getTime();
        return (
          <div className="cn-row" key={c.id}>
            <Link href={`/app/contacts/${c.id}`} className="cn-link">
              <span className="av" style={{ background: avatarBg(c.email) }} aria-hidden>{initials(c.name)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</b>
                <span className="muted" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[c.jobTitle, c.company].filter(Boolean).join(" · ") || c.email}</span>
                <span className="muted" style={{ display: "block" }}>{view === "events" ? (c.metAt || "Event") : view === "jobs" ? "Applied" : `${SOURCE[c.source] ?? c.source}${c.mode !== "ALL" && MODE_INFO[c.mode as Mode] ? ` · ${MODE_INFO[c.mode as Mode].label}` : ""}`} · {day(c.createdAt)}</span>
                {(c.tags || c.followUpAt) && <span style={{ display: "block", marginTop: 2 }}>
                  {c.followUpAt && <span className="pill" style={{ margin: "0 4px 0 0", borderColor: overdue ? "#c92a2a" : undefined, color: overdue ? "#a61b1b" : undefined }}>{day(c.followUpAt)}</span>}
                  {c.tags.split(",").filter(Boolean).slice(0, 2).map((t) => <span key={t} className="pill" style={{ margin: "0 4px 0 0" }}>#{t}</span>)}
                </span>}
              </span>
            </Link>
            <form action={toggleStar}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="back" value={here} /><button className="ghost sm" style={{ border: 0, background: "none", fontSize: 20, minWidth: 40, color: c.starred ? "#8a5a00" : "#5e5e5e" }} aria-label={c.starred ? `Unstar ${c.name}` : `Star ${c.name}`} aria-pressed={c.starred}>{c.starred ? "★" : "☆"}</button></form>
          </div>
        );
      })}
      {list.length === 100 && <p className="muted" style={{ textAlign: "center", margin: "6px 0" }}>Showing the first 100 · search to narrow down</p>}
      {people.length > 0 && <div className="row" style={{ marginTop: 6 }}><a className="btn ghost" href="/app/contacts/export?format=csv">Export CSV</a><a className="btn ghost" href="/app/contacts/export?format=vcf">Export vCard</a></div>}
    </>
  );
}

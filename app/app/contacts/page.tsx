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
  // Contacts who are on TapNodd show their own photo.
  const onApp = await db.profile.findMany({ where: { photo: { not: "" }, user: { email: { in: all.map((c) => c.email.toLowerCase()) } } }, select: { handle: true, photo: true, user: { select: { email: true } } } });
  const photoOf = new Map(onApp.map((x) => [x.user!.email.toLowerCase(), `/photo/${x.handle}?v=${encodeURIComponent(x.photo)}`]));
  const face = (c: { email: string; name: string }) => {
    const src = photoOf.get(c.email.toLowerCase());
    return src ? <img className="av" src={src} alt="" style={{ objectFit: "cover" }} /> : <span className="av" style={{ background: avatarBg(c.email) }} aria-hidden>{initials(c.name)}</span>;
  };
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
      <div className="d-ph">
        <div><h1 className="d-h1" style={{ margin: 0 }}>Connections</h1><div className="d-t2">{people.length} {people.length === 1 ? noun[0] : noun[1]}{counts.starred ? ` · ${counts.starred} starred` : ""}</div></div>
        <span style={{ display: "flex", gap: 8 }}>
          <Link href="/app/contacts/import" className="d-ibtn d-ibtn-o" aria-label="Import connections" title="Import"><Icon name="upload" /></Link>
          <Link href="/app/contacts/new" className="d-fab" aria-label="Add a connection" title="Add"><Icon name="plus" /></Link>
        </span>
      </div>

      <nav className="d-tabs" aria-label="Which connections">
        {([["people", "All"], ["events", "Events"], ["jobs", "Jobs"]] as [View, string][]).map(([k, l]) => (
          <Link key={k} href={k === "people" ? "/app/contacts" : `/app/contacts?v=${k}`} aria-current={view === k ? "page" : undefined}>{l} ({groups[k].length})</Link>
        ))}
      </nav>
      {view === "events" && <p className="d-sub" style={{ margin: "-4px 0 12px" }}>People who registered for or checked in at your events. <Link href="/app/events">Open Events</Link></p>}
      {view === "jobs" && <p className="d-sub" style={{ margin: "-4px 0 12px" }}>People who applied to your open roles. Review them in <Link href="/app/hire">Recruiting</Link>.</p>}

      <Link href="/app/contacts/inbox" className="d-li">
        <span className="d-ico" aria-hidden><Icon name="user" /></span>
        <span><b>Connection Requests</b><span>{[pending.length ? `${pending.length} request${pending.length === 1 ? "" : "s"}` : "No new requests", inboxCount ? `${inboxCount} approval${inboxCount === 1 ? "" : "s"} or applicant${inboxCount === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")}</span></span>
        {pending.length + inboxCount > 0 && <span className="badge d-badge">{pending.length + inboxCount}</span>}
        <span className="d-chev" aria-hidden><Icon name="chev" /></span>
      </Link>

      {pending.slice(0, 2).map((c) => (
        <div className="d-card d-req" key={c.id}>
          <div className="d-row" style={{ padding: 0 }}>{face(c)}<div className="d-grow"><span className="d-t1">{c.name}</span><span className="d-t2">{c.company || c.email} · wants to connect</span></div></div>
          <form action={decideConnection} className="d-req-btns"><input type="hidden" name="id" value={c.id} /><button name="choice" value="DECLINE" className="ghost sm" aria-label={`Decline ${c.name}`}>Decline</button><button name="choice" value="ACCEPT" className="sm" aria-label={`Accept ${c.name}`}>Accept</button></form>
        </div>
      ))}

      {due.length > 0 && (
        <section aria-labelledby="due" className="d-card">
          <h2 id="due" className="d-sec" style={{ margin: "0 0 4px", justifyContent: "flex-start", gap: 8 }}><span className="d-ico o" aria-hidden style={{ width: 32, height: 32, borderRadius: 9 }}><Icon name="bell" size={16} /></span>Follow up today <span className="badge d-badge">{due.length}</span></h2>
          {due.slice(0, 4).map((c) => (
            <div key={c.id} className="d-row" style={{ borderTop: "1px solid var(--line)" }}>
              <Link href={`/app/contacts/${c.id}`} className="d-grow" style={{ color: "inherit" }}><span className="d-t1">{c.name}</span><span className="d-t2">{c.followUpAt!.getTime() < Date.now() - 86400_000 ? `Overdue since ${day(c.followUpAt!)}` : "Due today"}</span></Link>
              <form action={setFollowUp}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="days" value="3" /><input type="hidden" name="back" value={here} /><button className="ghost sm" aria-label={`+3d: remind me about ${c.name} in 3 days`}>+3d</button></form>
              <form action={markFollowedUp}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="back" value={here} /><button className="sm" aria-label={`Done: followed up with ${c.name}`}>Done</button></form>
            </div>
          ))}
          {due.length > 4 && <Link href="/app/contacts?f=followup" className="d-t2">See all {due.length} ›</Link>}
        </section>
      )}

      <form method="get" role="search" className="d-search-row">
        {sp.v && <input type="hidden" name="v" value={sp.v} />}{sp.f && <input type="hidden" name="f" value={sp.f} />}{sp.tag && <input type="hidden" name="tag" value={sp.tag} />}
        <label className="dz-search" style={{ margin: 0, flex: 1 }}><Icon name="search" /><span className="sr-only">Search connections</span><input name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Search name, company, tag..." /></label>
        <label className="sr-only" htmlFor="sort">Sort by</label>
        <select id="sort" name="sort" defaultValue={sort} className="d-sort" aria-label="Sort by">{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <button className="sr-only">Search</button>
      </form>
      <nav className="d-chips" aria-label="Filter connections">
        {FILTERS.map(([k, l]) => <Link key={k} href={href({ f: k === "all" ? "" : k })} aria-current={f === k ? "page" : undefined}>{l}{k !== "all" && counts[k] > 0 ? ` · ${counts[k]}` : ""}</Link>)}
        {allTags.map((t) => <Link key={t} href={href({ tag: sp.tag === t ? "" : t })} aria-current={sp.tag === t ? "page" : undefined}>#{t}</Link>)}
      </nav>
      {list.length > 0 && <h2 className="d-sec" style={{ marginTop: 6 }}>{view === "people" ? "My Connections" : view === "events" ? "Event Contacts" : "Applicants"}</h2>}

      {people.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "26px 16px" }}>
          <span style={{ display: "inline-flex", width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,rgba(31,79,216,.12),rgba(61,107,234,.12))", color: "#8b5cf6", alignItems: "center", justifyContent: "center", marginBottom: 10 }} aria-hidden><Icon name="users" size={26} /></span>
          <b style={{ display: "block" }}>{view === "events" ? "No event contacts yet" : view === "jobs" ? "No applicants yet" : "No connections yet"}</b>
          <p className="muted">{view === "events" ? "People who register for or check in at your events appear here." : view === "jobs" ? "People who apply to your open roles appear here." : "Share your card, scan someone else's, or bring in a list you already have."}</p>
          {view === "people"
            ? <div className="row"><Link className="btn" href="/app/card">Share my card</Link><Link className="btn ghost" href="/app/contacts/import">Import a list</Link></div>
            : <Link className="btn" href={view === "events" ? "/app/events" : "/app/hire"}>{view === "events" ? "Open Events" : "Open Recruiting"}</Link>}
        </div>
      )}
      {people.length > 0 && list.length === 0 && <div className="card muted">Nobody matches. <Link href={view === "people" ? "/app/contacts" : `/app/contacts?v=${view}`}>Clear filters</Link></div>}

      {list.length > 0 && <div className="d-list">{list.map((c) => {
        const overdue = c.followUpAt && c.followUpAt.getTime() <= endOfToday.getTime();
        return (
          <div className="cn-row d-row" key={c.id}>
            <Link href={`/app/contacts/${c.id}`} className="cn-link">
              {face(c)}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="d-t1" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                <span className="d-t2" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[c.jobTitle, c.company].filter(Boolean).join(" · ") || c.email}</span>
                <span className="d-t2">{view === "events" ? (c.metAt || "Event") : view === "jobs" ? "Applied" : `${SOURCE[c.source] ?? c.source}${c.mode !== "ALL" && MODE_INFO[c.mode as Mode] ? ` · ${MODE_INFO[c.mode as Mode].label}` : ""}`} · {day(c.createdAt)}</span>
                {(c.tags || c.followUpAt) && <span style={{ display: "block", marginTop: 2 }}>
                  {c.followUpAt && <span className={"d-chip " + (overdue ? "r" : "o")} style={{ margin: "4px 4px 0 0", height: 22, fontSize: 11.5, padding: "0 8px" }}>{day(c.followUpAt)}</span>}
                  {c.tags.split(",").filter(Boolean).slice(0, 2).map((t) => <span key={t} className="d-chip" style={{ margin: "4px 4px 0 0", height: 22, fontSize: 11.5, padding: "0 8px" }}>#{t}</span>)}
                </span>}
              </span>
            </Link>
            <form action={toggleStar}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="back" value={here} /><button className="d-ibtn" style={{ fontSize: 22, color: c.starred ? "#F59E0B" : "var(--ink-4)" }} aria-label={c.starred ? `Unstar ${c.name}` : `Star ${c.name}`} aria-pressed={c.starred}>{c.starred ? "★" : "☆"}</button></form>
          </div>
        );
      })}</div>}
      {list.length === 100 && <p className="muted" style={{ textAlign: "center", margin: "6px 0" }}>Showing the first 100 · search to narrow down</p>}
      {people.length > 0 && <div className="d-tiles two" style={{ marginTop: 6 }}><a className="d-tile d-tile-l" href="/app/contacts/export?format=csv"><Icon name="download" /><span>Export CSV</span></a><a className="d-tile d-tile-l" href="/app/contacts/export?format=vcf"><Icon name="download" /><span>Export vCard</span></a></div>}
    </>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { byline } from "@/lib/look";
import Avatar from "@/components/avatar";
import Icon from "@/components/icon";
export const dynamic = "force-dynamic";
export const metadata = { title: "Discover" };

const TABS = [
  { k: "people", label: "People" },
  { k: "companies", label: "Companies" },
  { k: "events", label: "Events" },
] as const;

/** Discover: people, companies and events on TapNodd, with one search box. */
export default async function Discover({ searchParams }: { searchParams: Promise<{ t?: string; q?: string }> }) {
  const { profile } = await requireOwner();
  const sp = await searchParams;
  const t = TABS.some((x) => x.k === sp.t) ? sp.t! : "people";
  const q = (sp.q ?? "").trim();
  const like = q ? { contains: q } : undefined;

  const known = new Set((await db.contact.findMany({ where: { profileId: profile.id }, select: { email: true } })).map((c) => c.email.toLowerCase()));
  const people = t === "people" ? (await db.profile.findMany({
    where: { id: { not: profile.id }, userId: { not: null }, ...(like ? { OR: [{ name: like }, { headline: like }, { company: like }, { skills: like }] } : {}) },
    include: { user: { select: { email: true } } }, orderBy: [{ photo: "desc" }, { id: "desc" }], take: 30,
  })) : [];
  const orgs = t === "companies" ? await db.organization.findMany({ where: like ? { OR: [{ name: like }, { company: like }] } : {}, include: { members: true }, take: 30 }) : [];
  const owners = orgs.length ? await db.profile.findMany({ where: { userId: { in: orgs.flatMap((o) => o.members.map((m) => m.userId)) } } }) : [];
  const events = t === "events" ? await db.event.findMany({
    where: { published: true, visibility: "PUBLIC", ...(like ? { OR: [{ name: like }, { location: like }, { tags: like }] } : {}) },
    orderBy: { startsAt: "asc" }, take: 30,
  }) : [];
  const fmt = (d: Date | null) => d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Date to be set";

  return (
    <>
      <h1 className="d-h1">Discover</h1>
      <form action="/app/discover" className="dz-search" role="search">
        <input type="hidden" name="t" value={t} />
        <Icon name="search" />
        <label className="sr-only" htmlFor="dq">Search</label>
        <input id="dq" name="q" defaultValue={q} placeholder="Search people, companies, events..." autoComplete="off" />
      </form>
      <nav className="d-chips" aria-label="What to discover">
        {TABS.map((x) => <Link key={x.k} href={`/app/discover?t=${x.k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={t === x.k ? "page" : undefined}>{x.label}</Link>)}
        <Link href="/app/opportunities">Opportunities</Link>
      </nav>

      {t === "people" && (
        <>
          <h2 className="d-sec">{q ? `People matching "${q}"` : "Recommended for You"}</h2>
          {people.length === 0 ? <div className="d-empty"><b>Nobody found</b>Try a name, a skill or a company.</div> : (
            <div className="d-list">
              {people.map((x) => (
                <div key={x.id} className="d-row">
                  <Link href={`/${x.handle}`} aria-label={`Open ${x.name}'s card`} className="d-avl"><Avatar name={x.name} handle={x.handle} hasPhoto={!!x.photo} size={48} /></Link>
                  <Link href={`/${x.handle}`} className="d-grow"><span className="d-t1">{x.name}</span><span className="d-t2">{byline(x.headline, x.company) || `@${x.handle}`}</span></Link>
                  {known.has((x.user?.email ?? "").toLowerCase()) ? <span className="d-chip g">Connected</span> : <Link href={`/${x.handle}`} className="d-pill">Connect</Link>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {t === "companies" && (
        <>
          <h2 className="d-sec">Companies</h2>
          {orgs.length === 0 ? <div className="d-empty"><b>No companies yet</b>Teams appear here once they set up on TapNodd.</div> : orgs.map((o) => {
            const lead = owners.find((p) => p.userId === (o.members.find((m) => m.role === "OWNER") ?? o.members[0])?.userId);
            const name = o.company || o.name;
            return (
              <Link key={o.id} href={lead ? `/company/${lead.handle}` : "#"} className="d-li">
                <span className="d-ico" aria-hidden style={{ fontWeight: 800, fontSize: 16 }}>{name.slice(0, 1).toUpperCase()}</span>
                <span><b>{name}</b><span>{o.members.length} {o.members.length === 1 ? "person" : "people"} on TapNodd</span></span>
                <span className="d-chev" aria-hidden><Icon name="chev" /></span>
              </Link>
            );
          })}
        </>
      )}

      {t === "events" && (
        <>
          <h2 className="d-sec">Upcoming Events</h2>
          {events.length === 0 ? <div className="d-empty"><b>No public events</b>Events people publish appear here.</div> : events.map((e) => (
            <Link key={e.id} href={`/e/${e.slug}`} className="d-li" style={{ padding: 8 }}>
              {e.cover ? <img className="dz-thumb" src={`/event-img/${e.slug}/cover`} alt="" style={{ width: 84, height: 60, borderRadius: 10 }} /> : <span className="d-ico g" aria-hidden style={{ width: 60, height: 60 }}><Icon name="calendar" /></span>}
              <span><b>{e.name}</b><span>{fmt(e.startsAt)}{e.location ? ` • ${e.location}` : ""}</span></span>
              <span className="d-chev" aria-hidden><Icon name="chev" /></span>
            </Link>
          ))}
        </>
      )}
    </>
  );
}

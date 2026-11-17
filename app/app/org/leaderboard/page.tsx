import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { membership } from "@/lib/org";
import PageHead from "@/components/page-head";
import OrgNav from "@/components/org-nav";
import Avatar from "@/components/avatar";
export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard" };

const SPANS = [7, 30, 90];

/** Team leaderboard: who is getting their card seen and turning views into contacts. */
export default async function Leaderboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams;
  const { user } = await requireOwner();
  const m = await membership(user.id);
  if (!m) redirect("/app/org");
  const span = SPANS.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - (span - 1));

  const members = await db.orgMember.findMany({ where: { orgId: m.org.id } });
  const profiles = await db.profile.findMany({ where: { userId: { in: members.map((x) => x.userId) } }, select: { id: true, name: true, userId: true, handle: true, photo: true, avatar: true, headline: true } });
  const ids = profiles.map((p) => p.id);
  const [scans, contacts] = await Promise.all([
    db.scanEvent.groupBy({ by: ["shareLinkId"], where: { shareLink: { profileId: { in: ids } }, createdAt: { gte: since } }, _count: true }),
    db.contact.groupBy({ by: ["profileId"], where: { profileId: { in: ids }, status: { in: ["CONNECTED", "PENDING"] }, createdAt: { gte: since } }, _count: true }),
  ]);
  const linkOwner = Object.fromEntries((await db.shareLink.findMany({ where: { profileId: { in: ids } }, select: { id: true, profileId: true } })).map((l) => [l.id, l.profileId]));
  const views: Record<string, number> = {};
  for (const s of scans) { const pid = linkOwner[s.shareLinkId]; if (pid) views[pid] = (views[pid] ?? 0) + s._count; }
  const leads = Object.fromEntries(contacts.map((c) => [c.profileId, c._count]));

  // A new contact is worth three views: it is the result the views are for.
  const rows = profiles.map((p) => ({ ...p, views: views[p.id] ?? 0, leads: leads[p.id] ?? 0 }))
    .map((r) => ({ ...r, points: r.views + r.leads * 3, rate: r.views ? Math.round((r.leads / r.views) * 100) : 0 }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  const top = Math.max(1, rows[0]?.points ?? 0);
  const totalViews = rows.reduce((n, r) => n + r.views, 0), totalLeads = rows.reduce((n, r) => n + r.leads, 0);
  const myRank = rows.findIndex((r) => r.userId === user.id) + 1;

  return (
    <div className="lb">
      <PageHead title="Leaderboard" sub={`${m.org.name} · last ${span} days`} back="/app/org" />
      <OrgNav active="leaderboard" isAdmin={m.isAdmin} />

      <nav className="seg" aria-label="Period">
        {SPANS.map((d) => <Link key={d} href={d === 30 ? "/app/org/leaderboard" : `/app/org/leaderboard?days=${d}`} aria-current={d === span ? "page" : undefined}>{d} days</Link>)}
      </nav>

      <div className="share-stats">
        <div><b>{totalViews}</b><span>Card views</span></div>
        <div><b>{totalLeads}</b><span>New contacts</span></div>
        <div><b>{myRank ? `#${myRank}` : "–"}</b><span>Your place</span></div>
      </div>

      <h3 className="kit-sec">Ranking<span>{rows.length}</span></h3>
      {rows.every((r) => r.points === 0) && <div className="kit-empty">No views or contacts in this period yet. Share a card to get on the board.</div>}
      <ol className="lb-list">
        {rows.map((r, i) => (
          <li key={r.id} className={"lb-row" + (r.userId === user.id ? " me" : "") + (i < 3 && r.points > 0 ? " top" : "")}>
            <span className="lb-rank" aria-label={`Place ${i + 1}`}>{i + 1}</span>
            <Avatar name={r.name} handle={r.handle} hasPhoto={!!r.photo} avatar={r.avatar} size={42} />
            <div className="lb-main">
              <b>{r.name}{r.userId === user.id && <em>You</em>}</b>
              <span>{r.views} {r.views === 1 ? "view" : "views"} · {r.leads} {r.leads === 1 ? "contact" : "contacts"}{r.views > 0 ? ` · ${r.rate}% turned into contacts` : ""}</span>
              <i className="lb-bar" aria-hidden><i style={{ width: `${Math.max(r.points ? 4 : 0, (r.points / top) * 100)}%` }} /></i>
            </div>
            <span className="lb-pts"><b>{r.points}</b>pts</span>
          </li>
        ))}
      </ol>
      <p className="mode-add-note">Points: 1 for each card view, 3 for each new contact.</p>
    </div>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { membership } from "@/lib/org";
import PageHead from "@/components/page-head";
import OrgNav from "@/components/org-nav";
import { createOrg, leaveOrg } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Team" };

const DAYS = 30;

/** Team home: set up a team, or see team-wide numbers (views, taps, contacts) and recent admin activity. */
export default async function Org({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sp = await searchParams;
  const { user, profile } = await requireOwner();
  const m = await membership(user.id);

  if (!m) {
    return (
      <>
        <PageHead title="Team" sub="For companies: one brand, one directory, shared analytics and leads." back="/app/more" error={sp.err === "name" ? "Give your team a name." : undefined} />
        <div className="card">
          <h2 style={{ fontSize: 16, marginTop: 0 }}>Create your team</h2>
          <form action={createOrg}>
            <label className="f" htmlFor="o-name">Team name</label>
            <input id="o-name" name="name" required maxLength={80} placeholder="e.g. Lumen Labs" />
            <label className="f" htmlFor="o-co">Company shown on cards</label>
            <input id="o-co" name="company" maxLength={80} defaultValue={profile.company} />
            <button>Create team</button>
          </form>
        </div>
        <div className="card">
          <h2 style={{ fontSize: 16, marginTop: 0 }}>What you get</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Invite your people in bulk; remove them in one tap</li>
            <li>A locked brand kit: logo, colours and company name on every card</li>
            <li>A team directory where colleagues connect in one tap</li>
            <li>Team analytics, lead capture with tags, and CSV export</li>
            <li>A campaign banner in everyone&apos;s email signature</li>
            <li>Webhooks to Zapier, Make, Slack or your CRM</li>
          </ul>
        </div>
      </>
    );
  }

  const members = await db.orgMember.findMany({ where: { orgId: m.org.id } });
  const profiles = await db.profile.findMany({ where: { userId: { in: members.map((x) => x.userId) } }, select: { id: true, name: true, userId: true } });
  const ids = profiles.map((p) => p.id);
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - (DAYS - 1));
  const [scans, contacts, audits] = await Promise.all([
    db.scanEvent.findMany({ where: { shareLink: { profileId: { in: ids } }, createdAt: { gte: since } }, select: { source: true, createdAt: true, shareLink: { select: { profileId: true } } } }),
    db.contact.findMany({ where: { profileId: { in: ids }, status: { in: ["CONNECTED", "PENDING"] } }, select: { profileId: true, createdAt: true, source: true } }),
    m.isAdmin ? db.orgAudit.findMany({ where: { orgId: m.org.id }, orderBy: { createdAt: "desc" }, take: 8 }) : Promise.resolve([]),
  ]);
  const recentContacts = contacts.filter((c) => c.createdAt >= since);
  const bySource = (s: string) => scans.filter((x) => x.source === s).length;
  const days = Array.from({ length: DAYS }, (_, i) => { const d = new Date(since); d.setDate(d.getDate() + i); return d; });
  const perDay = days.map((d) => scans.filter((x) => x.createdAt.toDateString() === d.toDateString()).length);
  const max = Math.max(1, ...perDay);
  const board = profiles.map((p) => ({ name: p.name, scans: scans.filter((x) => x.shareLink.profileId === p.id).length, leads: recentContacts.filter((c) => c.profileId === p.id).length }))
    .sort((a, b) => b.scans + b.leads * 3 - (a.scans + a.leads * 3)).slice(0, 5);

  return (
    <>
      <PageHead title={m.org.name} sub={`Your role: ${m.role.toLowerCase()} · ${members.length} ${members.length === 1 ? "person" : "people"}`} back="/app/more" error={sp.err === "owner" ? "Owners can't leave. Hand over ownership first." : undefined} />
      <OrgNav active="overview" isAdmin={m.isAdmin} />

      <div className="stat">
        <div className="card"><b>{scans.length}</b><span className="muted">views · {DAYS} days</span></div>
        <div className="card"><b>{bySource("nfc")}</b><span className="muted">NFC taps</span></div>
        <div className="card"><b>{recentContacts.length}</b><span className="muted">new contacts</span></div>
      </div>

      <div className="card">
        <b>Views per day</b> <span className="muted">· QR {bySource("qr")} · link {bySource("link")} · NFC {bySource("nfc")}</span>
        <div className="bars" role="img" aria-label={`${scans.length} views in the last ${DAYS} days`}>{perDay.map((c, n) => <div key={n} className={n === DAYS - 1 ? "hi" : ""} style={{ height: `${(c / max) * 100}%` }} />)}</div>
      </div>

      <div className="card">
        <b>Top people</b>
        {board.length === 0 && <div className="muted">Nothing yet.</div>}
        <ol style={{ margin: "6px 0 0", paddingLeft: 20 }}>
          {board.map((b) => <li key={b.name}>{b.name} <span className="muted">· {b.scans} views · {b.leads} contacts</span></li>)}
        </ol>
      </div>

      {m.isAdmin && audits.length > 0 && (
        <div className="card">
          <b>Recent admin activity</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{audits.map((a) => <li key={a.id}>{a.action} <span className="muted">· {a.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}{a.detail ? ` · ${a.detail}` : ""}</span></li>)}</ul>
        </div>
      )}

      {!m.isOwner && <form action={leaveOrg}><button className="ghost">Leave team</button></form>}
      <Link href="/app/org/people" className="btn ghost" style={{ marginTop: 8 }}>Open team directory</Link>
    </>
  );
}

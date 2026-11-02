import Link from "next/link";
import { db } from "@/lib/db";
import I from "@/components/icon";
import { inviteState } from "@/lib/platform";
import { Ava, Chart, actionLabel, ago, perDay } from "./ui";

export default async function Overview() {
  const since30 = new Date(Date.now() - 30 * 86400000), since7 = new Date(Date.now() - 7 * 86400000);
  const [users, users7, active7, profiles, scans30, saved, events, attendees, jobs, apps, invites, recentUsers, log, topLinks] = await Promise.all([
    db.user.count(), db.user.count({ where: { createdAt: { gte: since7 } } }), db.user.count({ where: { lastSeenAt: { gte: since7 } } }),
    db.profile.count(), db.scanEvent.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true } }),
    db.savedCard.count(), db.event.count(), db.attendee.count(), db.job.count({ where: { open: true } }), db.application.count(),
    db.onboardingInvite.findMany({ select: { acceptedAt: true, revokedAt: true, expiresAt: true } }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { profile: { select: { handle: true, photo: true, headline: true, company: true } } } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.scanEvent.groupBy({ by: ["shareLinkId"], where: { createdAt: { gte: since30 } }, _count: true, orderBy: { _count: { shareLinkId: "desc" } }, take: 20 }),
  ]);
  const signups = await db.user.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true } });
  const signupChart = perDay(signups.map((u) => u.createdAt), 30), scanChart = perDay(scans30.map((s) => s.createdAt), 30);
  const pending = invites.filter((i) => inviteState(i) === "PENDING").length, accepted = invites.filter((i) => i.acceptedAt).length;

  // Most scanned people over 30 days.
  const links = await db.shareLink.findMany({ where: { id: { in: topLinks.map((t) => t.shareLinkId) } }, include: { profile: { select: { name: true, handle: true, photo: true, userId: true } } } });
  const byProfile = new Map<string, { name: string; handle: string; photo: string; userId: string | null; n: number }>();
  for (const t of topLinks) {
    const l = links.find((x) => x.id === t.shareLinkId); if (!l) continue;
    const cur = byProfile.get(l.profileId) ?? { ...l.profile, n: 0 }; cur.n += t._count; byProfile.set(l.profileId, cur);
  }
  const top = [...byProfile.values()].sort((a, b) => b.n - a.n).slice(0, 5);

  return (
    <>
      <div className="ad-head">
        <div><h1>Overview</h1><p>How FounderTouch is doing across every account.</p></div>
        <div className="ad-actions"><Link className="btn" href="/admin/onboarding"><I n="plus" size={16} /> Invite people</Link></div>
      </div>

      <div className="ad-stats">
        <div className="ad-stat"><small>Accounts</small><b>{users}</b><em className={users7 ? "" : "flat"}>+{users7} this week</em></div>
        <div className="ad-stat"><small>Active in 7 days</small><b>{active7}</b><em className="flat">{users ? Math.round((active7 / users) * 100) : 0}% of accounts</em></div>
        <div className="ad-stat"><small>Cards set up</small><b>{profiles}</b><em className="flat">{users - profiles} still onboarding</em></div>
        <div className="ad-stat"><small>Scans, 30 days</small><b>{scans30.length}</b><em className="flat">{saved} cards saved</em></div>
        <div className="ad-stat"><small>Invites</small><b>{pending}</b><em className="flat">pending, {accepted} accepted</em></div>
        <div className="ad-stat"><small>Events · open roles</small><b>{events} · {jobs}</b><em className="flat">{attendees} attendees, {apps} applicants</em></div>
      </div>

      <div className="ad-grid">
        <div className="ad-panel">
          <div className="ad-panel-head"><h2>Card scans</h2><span className="muted">Last 30 days</span></div>
          <div className="ad-panel-body"><Chart {...scanChart} label="Scans" /></div>
        </div>
        <div className="ad-panel">
          <div className="ad-panel-head"><h2>New accounts</h2><span className="muted">Last 30 days</span></div>
          <div className="ad-panel-body"><Chart {...signupChart} label="Sign-ups" /></div>
        </div>
      </div>

      <div className="ad-grid">
        <div className="ad-panel">
          <div className="ad-panel-head"><h2>Newest accounts</h2><Link href="/admin/users" className="muted">All users</Link></div>
          <table className="ad-table">
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.id}>
                  <td><Link href={`/admin/users/${u.id}`} className="ad-who"><Ava name={u.name} photo={u.profile?.photo} handle={u.profile?.handle} /><div><b>{u.name}</b><small>{u.email}</small></div></Link></td>
                  <td>{u.profile ? <span className="ad-tag good">Card ready</span> : <span className="ad-tag warn">Onboarding</span>}</td>
                  <td className="num muted">{ago(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ad-panel">
          <div className="ad-panel-head"><h2>Most scanned</h2><span className="muted">30 days</span></div>
          {top.length === 0 ? <div className="ad-empty">No scans yet.</div> : (
            <table className="ad-table"><tbody>
              {top.map((p) => (
                <tr key={p.handle}>
                  <td>{p.userId ? <Link href={`/admin/users/${p.userId}`} className="ad-who"><Ava name={p.name} photo={p.photo} handle={p.handle} /><b>{p.name}</b></Link> : <span className="ad-who"><Ava name={p.name} /><b>{p.name}</b></span>}</td>
                  <td className="num"><b>{p.n}</b></td>
                </tr>
              ))}
            </tbody></table>
          )}
        </div>
      </div>

      <div className="ad-panel">
        <div className="ad-panel-head"><h2>Team activity</h2><Link href="/admin/audit" className="muted">Audit log</Link></div>
        {log.length === 0 ? <div className="ad-empty">Nothing yet. Changes the team makes show up here.</div> : (
          <ul className="ad-feed">
            {log.map((l) => (
              <li key={l.id}><I n="dot" size={14} /><div><b>{l.actorEmail}</b> {actionLabel(l.action)} {l.detail}<small>{ago(l.createdAt)}</small></div></li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

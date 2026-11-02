import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import I from "@/components/icon";
import { MODE_INFO, Mode } from "@/lib/modes";
import { byline } from "@/lib/look";
import { currentUser } from "@/lib/auth";
import { deleteUser, revokeSession, setUserRole, setUserStatus, signOutEverywhere } from "../../actions";
import { Ava, Flash, actionLabel, ago, day, userStatusTag } from "../../ui";

const MSG = {
  suspended: "Account suspended. They were signed out everywhere and their card no longer opens.",
  restored: "Account restored.", role: "Role updated.", signed_out: "Signed out of every device.", session: "That session was ended.",
  self: "You cannot do that to your own account.", confirm: "Type the account's email exactly to delete it.",
};

export default async function UserDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const [{ id }, sp, me] = await Promise.all([params, searchParams, currentUser()]);
  const u = await db.user.findUnique({
    where: { id },
    include: {
      sessions: { orderBy: { lastUsedAt: "desc" } },
      profile: { include: { modes: true, links: { include: { _count: { select: { scans: true } } } }, _count: { select: { contacts: true, resources: true, events: true, jobs: true, projects: true, career: true } } } },
      _count: { select: { saved: true } },
    },
  });
  if (!u) notFound();
  const p = u.profile, self = me?.id === u.id;
  const [invite, log] = await Promise.all([
    u.inviteId ? db.onboardingInvite.findUnique({ where: { id: u.inviteId } }) : null,
    db.auditLog.findMany({ where: { targetId: u.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const scans = p?.links.reduce((n, l) => n + l._count.scans, 0) ?? 0;

  return (
    <>
      <Link href="/admin/users" className="ad-crumb"><I n="arrow-left" size={14} /> Users</Link>
      <div className="ad-head">
        <div className="ad-who" style={{ gap: 14 }}>
          <span style={{ transform: "scale(1.6)", margin: "0 10px 0 6px" }}><Ava name={u.name} photo={p?.photo} handle={p?.handle} /></span>
          <div><h1>{u.name}</h1><p>{u.email} · joined {day(u.createdAt)}</p></div>
        </div>
        <div className="ad-actions">
          {userStatusTag(u.status)} {u.role === "ADMIN" && <span className="ad-tag ink">FounderTouch team</span>}
          {p && <a className="btn ghost" href={`/${p.handle}`} target="_blank" rel="noreferrer"><I n="external" size={15} /> Open card</a>}
        </div>
      </div>
      <Flash ok={sp.ok} err={sp.err} msgs={MSG} />

      <div className="ad-stats">
        <div className="ad-stat"><small>Scans</small><b>{scans}</b></div>
        <div className="ad-stat"><small>Contacts</small><b>{p?._count.contacts ?? 0}</b></div>
        <div className="ad-stat"><small>Saved cards</small><b>{u._count.saved}</b></div>
        <div className="ad-stat"><small>Files</small><b>{p?._count.resources ?? 0}</b></div>
        <div className="ad-stat"><small>Events · roles</small><b>{p ? `${p._count.events} · ${p._count.jobs}` : "0 · 0"}</b></div>
        <div className="ad-stat"><small>Last seen</small><b style={{ fontSize: 18, marginTop: 12 }}>{ago(u.lastSeenAt)}</b></div>
      </div>

      <div className="ad-grid">
        <div>
          <div className="ad-panel">
            <div className="ad-panel-head"><h2>Card</h2>{p && <span className="muted">/{p.handle}</span>}</div>
            <div className="ad-panel-body">
              {!p ? <p className="muted" style={{ margin: 0 }}>This person created an account but has not set up their card yet.</p> : (
                <dl className="ad-kv">
                  <dt>Headline</dt><dd>{byline(p.headline, p.company) || <span className="muted">Not set</span>}</dd>
                  <dt>Bio</dt><dd>{p.bio || <span className="muted">Not set</span>}</dd>
                  <dt>Contact</dt><dd>{[p.phone, p.email, p.website].filter(Boolean).join(" · ") || <span className="muted">None</span>}</dd>
                  <dt>Modes on</dt><dd style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{p.modes.filter((m) => m.isEnabled && m.mode !== "ALL").map((m) => <span key={m.mode} className="ad-tag">{MODE_INFO[m.mode as Mode]?.label ?? m.mode}{m.requireApproval && " · approval"}</span>)}</dd>
                  <dt>Hire me</dt><dd>{p.openTo || <span className="muted">Not shown</span>}</dd>
                  <dt>Joined via</dt><dd>{invite ? <>Invite from the team{invite.batch && ` (${invite.batch})`}</> : "Self sign-up"}</dd>
                </dl>
              )}
            </div>
          </div>

          <div className="ad-panel">
            <div className="ad-panel-head"><h2>Signed-in devices</h2><span className="muted">{u.sessions.length}</span></div>
            {u.sessions.length === 0 ? <div className="ad-empty">Not signed in anywhere.</div> : (
              <table className="ad-table"><tbody>
                {u.sessions.map((s) => (
                  <tr key={s.token}>
                    <td><b>{s.kind === "mobile" ? (s.device || "Mobile app") : "Web browser"}</b><div className="muted">Started {day(s.createdAt)}</div></td>
                    <td><span className={"ad-tag " + (s.kind === "mobile" ? "blue" : "")}>{s.kind === "mobile" ? "Mobile" : "Web"}</span></td>
                    <td className="num muted">{ago(s.lastUsedAt)}</td>
                    <td className="num"><form action={revokeSession}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="token" value={s.token} /><button className="ghost sm">End</button></form></td>
                  </tr>
                ))}
              </tbody></table>
            )}
          </div>
        </div>

        <div>
          <div className="ad-panel">
            <div className="ad-panel-head"><h2>Manage</h2></div>
            <div className="ad-panel-body" style={{ display: "grid", gap: 14 }}>
              {self && <p className="muted" style={{ margin: 0 }}>This is your own account, so suspending, role changes and deletion are off.</p>}
              <div>
                <b>Account access</b>
                <p className="muted" style={{ margin: "2px 0 8px" }}>{u.status === "ACTIVE" ? "Suspending signs them out everywhere and hides their card and pages." : "Restoring lets them log in and makes their card public again."}</p>
                <form action={setUserStatus}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="status" value={u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
                  <button className={u.status === "ACTIVE" ? "danger" : ""} disabled={self}>{u.status === "ACTIVE" ? "Suspend account" : "Restore account"}</button></form>
              </div>
              <div>
                <b>Role</b>
                <p className="muted" style={{ margin: "2px 0 8px" }}>Team members can open this admin console.</p>
                <form action={setUserRole}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="role" value={u.role === "ADMIN" ? "USER" : "ADMIN"} />
                  <button className="ghost" disabled={self}>{u.role === "ADMIN" ? "Remove from team" : "Add to FounderTouch team"}</button></form>
              </div>
              <div>
                <b>Sessions</b>
                <p className="muted" style={{ margin: "2px 0 8px" }}>Use this if a phone is lost or a password may be known.</p>
                <form action={signOutEverywhere}><input type="hidden" name="id" value={u.id} /><button className="ghost">Sign out of every device</button></form>
              </div>
            </div>
          </div>

          <div className="ad-panel">
            <div className="ad-panel-head"><h2>Team history</h2></div>
            {log.length === 0 ? <div className="ad-empty">No changes by the team.</div> : (
              <ul className="ad-feed">{log.map((l) => <li key={l.id}><I n="dot" size={14} /><div>{l.actorEmail} {actionLabel(l.action)}<small>{ago(l.createdAt)}</small></div></li>)}</ul>
            )}
          </div>

          {!self && (
            <div className="ad-panel ad-danger">
              <div className="ad-panel-head"><h2>Delete account</h2></div>
              <div className="ad-panel-body">
                <p className="muted" style={{ marginTop: 0 }}>Removes the account, card, pages, contacts and activity for good. This cannot be undone.</p>
                <form action={deleteUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <label className="f">Type <b>{u.email}</b> to confirm</label>
                  <input name="confirm" autoComplete="off" />
                  <button className="danger">Delete permanently</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

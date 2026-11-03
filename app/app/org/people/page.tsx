import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { membership } from "@/lib/org";
import { byline } from "@/lib/look";
import PageHead from "@/components/page-head";
import OrgNav from "@/components/org-nav";
import CopyButton from "@/components/copy-button";
import Avatar from "@/components/avatar";
import { inviteMany, revokeInvite, removeMember, setRole, connectColleague } from "../actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Team directory" };

/** The corporate directory. Everyone can search and connect; admins also invite, change roles and remove people. */
export default async function People({ searchParams }: { searchParams: Promise<{ q?: string; err?: string; saved?: string; connected?: string }> }) {
  const sp = await searchParams;
  const { user, profile } = await requireOwner();
  const m = await membership(user.id);
  if (!m) notFound();
  const q = (sp.q ?? "").trim().toLowerCase();
  const members = await db.orgMember.findMany({ where: { orgId: m.org.id }, orderBy: { createdAt: "asc" } });
  const profiles = await db.profile.findMany({ where: { userId: { in: members.map((x) => x.userId) } } });
  const invites = m.isAdmin ? await db.orgInvite.findMany({ where: { orgId: m.org.id }, orderBy: { createdAt: "desc" } }) : [];
  const mine = await db.contact.findMany({ where: { profileId: profile.id, status: "CONNECTED" }, select: { email: true } });
  const have = new Set(mine.map((c) => c.email));
  const users = await db.user.findMany({ where: { id: { in: members.map((x) => x.userId) } }, select: { id: true, email: true } });
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const rows = members.map((mem) => ({ mem, p: profiles.find((p) => p.userId === mem.userId), email: users.find((u) => u.id === mem.userId)?.email ?? "" }))
    .filter((r) => r.p && (!q || `${r.p.name} ${r.p.headline} ${r.email}`.toLowerCase().includes(q)));

  return (
    <>
      <PageHead title="People" sub="Your team directory." back="/app/org" saved={!!sp.saved} error={sp.err === "emails" ? "Add at least one valid email." : undefined} />
      <OrgNav active="people" isAdmin={m.isAdmin} />
      {sp.connected && <div className="ok">Connected. They are in your Connections now.</div>}

      <form method="get" className="row" style={{ marginBottom: 10 }}>
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search people" aria-label="Search people" />
        <button className="ghost" style={{ width: "auto" }}>Search</button>
      </form>

      {rows.map(({ mem, p, email }) => p && (
        <div className="card" key={mem.id}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Avatar name={p.name} handle={p.handle} hasPhoto={!!p.photo} avatar={p.avatar} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{p.name}</b> <span className="pill" style={{ margin: 0 }}>{mem.role.toLowerCase()}</span>
              <div className="muted">{byline(p.headline, p.company) || email}</div>
            </div>
          </div>
          <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
            <a className="btn ghost" href={`/${p.handle}`} target="_blank" rel="noopener noreferrer">View card</a>
            {p.id !== profile.id && (have.has(email)
              ? <span className="muted" style={{ alignSelf: "center", textAlign: "center" }}>✓ Connected</span>
              : <form action={connectColleague}><input type="hidden" name="profileId" value={p.id} /><button>Connect</button></form>)}
          </div>
          {m.isAdmin && mem.role !== "OWNER" && mem.userId !== user.id && (
            <div className="row" style={{ marginTop: 8, flexWrap: "wrap" }}>
              {m.isOwner && (
                <form action={setRole} className="row"><input type="hidden" name="id" value={mem.id} />
                  <select name="role" defaultValue={mem.role} aria-label={`Role for ${p.name}`}><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select>
                  <button className="ghost sm">Set role</button></form>
              )}
              {(mem.role === "MEMBER" || m.isOwner) && <form action={removeMember}><input type="hidden" name="id" value={mem.id} /><button className="ghost sm">Remove from team</button></form>}
            </div>
          )}
        </div>
      ))}
      {rows.length === 0 && <div className="card muted">No one matches.</div>}

      {m.isAdmin && (
        <>
          <h2 style={{ fontSize: 15, margin: "18px 0 8px" }}>Invite people</h2>
          <form action={inviteMany} className="card">
            <label className="f" htmlFor="inv">Emails (one per line, or separated by commas)</label>
            <textarea id="inv" name="emails" rows={4} placeholder={"ana@company.com\nraj@company.com"} />
            {m.isOwner && <><label className="f" htmlFor="inv-role">Role</label><select id="inv-role" name="role"><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select></>}
            <button>Send invites</button>
            <p className="muted" style={{ marginBottom: 0 }}>Each person gets a private join link. They are added to the team when they open it, and your brand is applied to their card.</p>
          </form>
          {invites.length > 0 && (
            <>
              <h2 style={{ fontSize: 15, margin: "18px 0 8px" }}>Pending invites ({invites.length})</h2>
              {invites.map((i) => (
                <div className="card" key={i.id}>
                  <b>{i.email}</b> <span className="muted">· {i.role.toLowerCase()}</span>
                  <div className="row" style={{ marginTop: 8 }}>
                    <CopyButton label="Copy join link" text={`${origin}/join/${i.token}`} />
                    <form action={revokeInvite}><input type="hidden" name="id" value={i.id} /><button className="ghost">Revoke</button></form>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}

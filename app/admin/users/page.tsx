import Link from "next/link";
import { db } from "@/lib/db";
import { Ava, Flash, ago, userStatusTag } from "../ui";

const PER = 25;

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; p?: string; ok?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim(), f = sp.f ?? "all", page = Math.max(1, Number(sp.p) || 1);
  const where = {
    ...(q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }, { profile: { is: { handle: { contains: q } } } }, { profile: { is: { company: { contains: q } } } }] } : {}),
    ...(f === "admins" ? { role: "ADMIN" } : f === "suspended" ? { status: "SUSPENDED" } : f === "onboarding" ? { profile: { is: null } } : {}),
  };
  const [rows, total, scanCounts] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { profile: { select: { id: true, handle: true, photo: true, headline: true, company: true, _count: { select: { contacts: true } } } }, _count: { select: { sessions: true } } } }),
    db.user.count({ where }),
    db.scanEvent.groupBy({ by: ["shareLinkId"], _count: true }),
  ]);
  const links = await db.shareLink.findMany({ where: { profileId: { in: rows.map((r) => r.profile?.id).filter((x): x is string => !!x) } }, select: { id: true, profileId: true } });
  const scansOf = (pid?: string) => links.filter((l) => l.profileId === pid).reduce((n, l) => n + (scanCounts.find((c) => c.shareLinkId === l.id)?._count ?? 0), 0);
  const qs = (o: Record<string, string | number>) => "?" + new URLSearchParams({ ...(q ? { q } : {}), f, ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) }).toString();
  const pages = Math.max(1, Math.ceil(total / PER));

  return (
    <>
      <div className="ad-head">
        <div><h1>Users</h1><p>{total} account{total === 1 ? "" : "s"}{f !== "all" ? " in this view" : ""}.</p></div>
        <div className="ad-actions"><Link className="btn" href="/admin/onboarding">Invite people</Link></div>
      </div>
      <Flash ok={sp.ok} msgs={{ deleted: "The account was deleted." }} />
      <div className="ad-panel">
        <form className="ad-bar">
          <input type="search" name="q" defaultValue={q} placeholder="Search name, email, handle or company" aria-label="Search users" />
          <input type="hidden" name="f" value={f} />
          <button className="ghost">Search</button>
          <div className="ad-seg" style={{ marginLeft: "auto" }}>
            {[["all", "All"], ["onboarding", "Onboarding"], ["admins", "Team"], ["suspended", "Suspended"]].map(([k, l]) => (
              <Link key={k} href={"?" + new URLSearchParams({ ...(q ? { q } : {}), f: k }).toString()} className={f === k ? "on" : ""}>{l}</Link>
            ))}
          </div>
        </form>
        {rows.length === 0 ? <div className="ad-empty">No one matches.</div> : (
          <table className="ad-table">
            <thead><tr><th>Person</th><th>Card</th><th>Status</th><th className="num">Scans</th><th className="num">Contacts</th><th className="num">Devices</th><th className="num">Last seen</th><th className="num">Joined</th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td><Link href={`/admin/users/${u.id}`} className="ad-who"><Ava name={u.name} photo={u.profile?.photo} handle={u.profile?.handle} /><div><b>{u.name} {u.role === "ADMIN" && <span className="ad-tag ink">Team</span>}</b><small>{u.email}</small></div></Link></td>
                  <td>{u.profile ? <a href={`/${u.profile.handle}`} target="_blank" rel="noreferrer">/{u.profile.handle}</a> : <span className="ad-tag warn">Not set up</span>}</td>
                  <td>{userStatusTag(u.status)}</td>
                  <td className="num">{u.profile ? scansOf(u.profile.id) : "–"}</td>
                  <td className="num">{u.profile?._count.contacts ?? "–"}</td>
                  <td className="num">{u._count.sessions}</td>
                  <td className="num muted">{ago(u.lastSeenAt)}</td>
                  <td className="num muted">{ago(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pages > 1 && (
          <div className="ad-pager">
            <span>Page {page} of {pages}</span>
            <div className="ad-actions">
              {page > 1 && <Link className="btn ghost sm" href={qs({ p: page - 1 })}>Previous</Link>}
              {page < pages && <Link className="btn ghost sm" href={qs({ p: page + 1 })}>Next</Link>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

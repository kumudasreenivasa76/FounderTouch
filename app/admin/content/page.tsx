import Link from "next/link";
import { db } from "@/lib/db";
import { KIND_TITLES } from "@/lib/kinds";
import { removeResource } from "../actions";
import { Flash, ago } from "../ui";

export default async function Content({ searchParams }: { searchParams: Promise<{ ok?: string; k?: string }> }) {
  const sp = await searchParams;
  const kind = sp.k ?? "all";
  const [rows, pendingDeck, pendingMode] = await Promise.all([
    db.resource.findMany({ where: kind === "all" ? {} : kind === "gated" ? { gated: true } : { kind }, orderBy: { createdAt: "desc" }, take: 200, include: { profile: { select: { name: true, handle: true, userId: true } }, _count: { select: { requests: true } } } }),
    db.deckRequest.count({ where: { status: "PENDING" } }), db.modeRequest.count({ where: { status: "PENDING" } }),
  ]);
  return (
    <>
      <div className="ad-head"><div><h1>Content</h1><p>Decks, demos, resumes and documents people have added to their pages.</p></div></div>
      <Flash ok={sp.ok} msgs={{ removed: "Removed. It no longer shows on that page." }} />
      <div className="ad-stats">
        <div className="ad-stat"><small>Files and links</small><b>{rows.length}</b><em className="flat">in this view</em></div>
        <div className="ad-stat"><small>Behind approval</small><b>{rows.filter((r) => r.gated).length}</b></div>
        <div className="ad-stat"><small>Access requests waiting</small><b>{pendingDeck + pendingMode}</b><em className="flat">across all users</em></div>
      </div>
      <div className="ad-panel">
        <div className="ad-bar">
          <div className="ad-seg">
            {[["all", "All"], ["gated", "Needs approval"], ["DECK", "Decks"], ["DEMO", "Demos"], ["RESUME", "Resumes"], ["DOC", "Documents"]].map(([k, l]) => <Link key={k} href={`?k=${k}`} className={kind === k ? "on" : ""}>{l}</Link>)}
          </div>
        </div>
        {rows.length === 0 ? <div className="ad-empty">Nothing here.</div> : (
          <table className="ad-table">
            <thead><tr><th>Title</th><th>Type</th><th>Owner</th><th>Source</th><th className="num">Requests</th><th className="num">Added</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.title}</b> {r.gated && <span className="ad-tag warn">Approval</span>}</td>
                  <td className="muted">{KIND_TITLES[r.kind] ?? r.kind}</td>
                  <td>{r.profile.userId ? <Link href={`/admin/users/${r.profile.userId}`}>{r.profile.name}</Link> : r.profile.name}</td>
                  <td>{r.filePath ? <a href={`/files/${r.id}`} target="_blank" rel="noreferrer">Uploaded file</a> : r.url ? <a href={r.url} target="_blank" rel="noreferrer">Link</a> : ""}</td>
                  <td className="num">{r._count.requests}</td>
                  <td className="num muted">{ago(r.createdAt)}</td>
                  <td className="num"><form action={removeResource}><input type="hidden" name="id" value={r.id} /><button className="ghost sm">Remove</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

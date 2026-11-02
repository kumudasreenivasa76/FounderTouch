import { db } from "@/lib/db";
import { actionLabel, ago } from "../ui";

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const rows = await db.auditLog.findMany({ where: q ? { OR: [{ actorEmail: { contains: q } }, { action: { contains: q } }, { detail: { contains: q } }] } : {}, orderBy: { createdAt: "desc" }, take: 300 });
  return (
    <>
      <div className="ad-head"><div><h1>Audit log</h1><p>Every change the FounderTouch team makes. Entries cannot be edited or removed from here.</p></div></div>
      <div className="ad-panel">
        <form className="ad-bar"><input type="search" name="q" defaultValue={q} placeholder="Search by person, action or detail" aria-label="Search the audit log" /><button className="ghost">Search</button></form>
        {rows.length === 0 ? <div className="ad-empty">No entries.</div> : (
          <table className="ad-table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Detail</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="muted" title={r.createdAt.toISOString()}>{ago(r.createdAt)}</td>
                  <td>{r.actorEmail}</td>
                  <td><span className="ad-tag">{r.action}</span> <span className="muted">{actionLabel(r.action)}</span></td>
                  <td>{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

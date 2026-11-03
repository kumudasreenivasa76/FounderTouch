import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { membership } from "@/lib/org";
import PageHead from "@/components/page-head";
import OrgNav from "@/components/org-nav";
export const dynamic = "force-dynamic";
export const metadata = { title: "Team leads" };

/** Every contact captured by anyone on the team, tagged by rep and source, filterable, with export. */
export default async function Leads({ searchParams }: { searchParams: Promise<{ rep?: string; source?: string; tag?: string }> }) {
  const sp = await searchParams;
  const { user } = await requireOwner();
  const m = await membership(user.id);
  if (!m || !m.isAdmin) notFound();
  const members = await db.orgMember.findMany({ where: { orgId: m.org.id } });
  const profiles = await db.profile.findMany({ where: { userId: { in: members.map((x) => x.userId) } }, select: { id: true, name: true } });
  const all = await db.contact.findMany({ where: { profileId: { in: profiles.map((p) => p.id) }, status: { in: ["CONNECTED", "PENDING"] } }, orderBy: { createdAt: "desc" } });
  const rep = (id: string) => profiles.find((p) => p.id === id)?.name ?? "";
  const leads = all.filter((c) => (!sp.rep || c.profileId === sp.rep) && (!sp.source || c.source === sp.source) && (!sp.tag || c.tags.split(",").includes(sp.tag)));
  const sources = [...new Set(all.map((c) => c.source))];
  const tags = [...new Set(all.flatMap((c) => c.tags.split(",").filter(Boolean)))];
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <PageHead title="Leads" sub={`${leads.length} of ${all.length} contacts captured by your team.`} back="/app/org" />
      <OrgNav active="leads" isAdmin />
      <form method="get" className="card">
        <div className="row">
          <div><label className="f" htmlFor="l-rep">Person</label><select id="l-rep" name="rep" defaultValue={sp.rep ?? ""}><option value="">Everyone</option>{profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="f" htmlFor="l-src">Source</label><select id="l-src" name="source" defaultValue={sp.source ?? ""}><option value="">All</option>{sources.map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
        {tags.length > 0 && <><label className="f" htmlFor="l-tag">Tag</label><select id="l-tag" name="tag" defaultValue={sp.tag ?? ""}><option value="">All</option>{tags.map((t) => <option key={t}>{t}</option>)}</select></>}
        <div className="row"><button>Filter</button><a className="btn ghost" href={`/app/org/leads/export${qs ? "?" + qs : ""}`}>Export CSV</a></div>
      </form>
      {leads.length === 0 && <div className="card muted">No leads match.</div>}
      {leads.slice(0, 100).map((c) => (
        <div className="card" key={c.id}>
          <b>{c.name}</b> <span className="pill" style={{ margin: 0 }}>{c.source}</span>{c.status === "PENDING" && <span className="pill" style={{ margin: "0 0 0 4px" }}>pending</span>}
          <div className="muted">{c.company ? c.company + " · " : ""}{c.email}</div>
          <div className="muted">Captured by {rep(c.profileId)} · {c.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}{c.tags ? ` · ${c.tags.split(",").map((t) => "#" + t).join(" ")}` : ""}</div>
        </div>
      ))}
      {leads.length > 100 && <p className="muted">Showing the latest 100. Export to see all.</p>}
    </>
  );
}

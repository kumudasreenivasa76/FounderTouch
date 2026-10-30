import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import Avatar from "@/components/avatar";
import PageHead from "@/components/page-head";
import { addMember, delMember, saveCompany } from "../actions";
export const dynamic = "force-dynamic";

const ERR: Record<string, string> = {
  nouser: "No FounderTouch user has that username.",
  self: "That is your own username.",
  member: "Enter a name, or a FounderTouch username.",
};

export default async function Company({ searchParams }: { searchParams: Promise<{ err?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const team = await db.teamMember.findMany({ where: { profileId: profile.id }, orderBy: { order: "asc" } });
  const linked = await db.profile.findMany({ where: { handle: { in: team.map((t) => t.memberHandle).filter(Boolean) } } });
  return (
    <>
      <PageHead title="Company" sub="Your company and the people behind it." saved={!!sp.saved} error={sp.err ? ERR[sp.err] ?? "Something went wrong." : undefined} />

      <form action={saveCompany} className="card">
        <label className="f">Company name</label>
        <input name="company" defaultValue={profile.company} placeholder="e.g. Lumen Labs" autoComplete="organization" />
        <label className="f">Company website</label>
        <input name="website" defaultValue={profile.website} placeholder="yourcompany.com" inputMode="url" autoCapitalize="none" />
        <button>Save company</button>
      </form>

      <h2>Team ({team.length})</h2>
      {team.length === 0 && <div className="card muted">No team members yet. Add people below. They appear on your page for every mode except Customer.</div>}
      {team.map((m) => {
        const lp = linked.find((x) => x.handle === m.memberHandle);
        return (
          <div className="card" key={m.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={lp?.name ?? m.name} handle={lp?.handle ?? ""} hasPhoto={!!lp?.photo} avatar={lp?.avatar ?? ""} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{lp?.name ?? m.name}</b>{m.memberHandle && <span className="pill" style={{ marginLeft: 6 }}>@{m.memberHandle}</span>}
              <div className="muted">{m.role || lp?.headline || "No role"}{m.link && !m.memberHandle ? " · " + m.link.replace(/^https?:\/\//, "") : ""}</div>
            </div>
            <form action={delMember}><input type="hidden" name="id" value={m.id} /><button className="ghost sm">Remove</button></form>
          </div>
        );
      })}

      <form action={addMember} className="card">
        <h3>Add a team member</h3>
        <label className="f">By FounderTouch username</label>
        <input name="username" placeholder="e.g. priya-nair" autoCapitalize="none" autoCorrect="off" />
        <p className="muted" style={{ margin: "0 0 4px" }}>This fills in their name and photo and links to their page.</p>
        <label className="f">Or add manually</label>
        <input name="name" placeholder="Name" />
        <input name="role" placeholder="Role (e.g. CTO)" />
        <input name="link" placeholder="Link (LinkedIn, portfolio…)" inputMode="url" autoCapitalize="none" />
        <button className="ghost">Add member</button>
      </form>
    </>
  );
}

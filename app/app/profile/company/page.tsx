import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import Avatar from "@/components/avatar";
import Icon from "@/components/icon";
import { addMember, delMember, saveBrand, saveCompany } from "../actions";
import BrandForm from "@/components/brand-form";
import { themeOf } from "@/lib/look";
import BackLink from "@/components/back-link";
export const dynamic = "force-dynamic";
export const metadata = { title: "Company" };

const ERR: Record<string, string> = {
  nouser: "No TapNodd user has that username. Check the spelling, or add them by hand.",
  self: "That is your own username.",
  member: "Enter a TapNodd username, or a name to add them by hand.",
  logo: "The logo must be a PNG, JPG or WebP under 2 MB.",
  locked: "Your team controls the company name, colours and logo.",
};

/** Company: its name, its logo and colours, and the people behind it. */
export default async function Company({ searchParams }: { searchParams: Promise<{ err?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const team = await db.teamMember.findMany({ where: { profileId: profile.id }, orderBy: { order: "asc" } });
  const linked = await db.profile.findMany({ where: { handle: { in: team.map((t) => t.memberHandle).filter(Boolean) } } });
  return (
    <div className="co">
      <BackLink href="/app" />
      <div className="kit-lux-top share-top" style={{ marginTop: 10 }}>
        <i className="kit-lux-ic" aria-hidden><Icon name="building" size={24} /></i>
        <div>
          <b>Company</b>
          <span>Your company and the people behind it</span>
        </div>
      </div>
      {sp.saved && <div className="ok">Saved</div>}
      {sp.err && <div className="err">{ERR[sp.err] ?? "Something went wrong."}</div>}

      <nav className="lk-jump" aria-label="Sections" style={{ marginTop: 0 }}>
        <a href="#name">1 · Name</a><a href="#brand">2 · Logo and colours</a><a href="#team">3 · Team</a>
      </nav>

      <h3 className="kit-sec" id="name">Company name</h3>
      <form action={saveCompany} className="card kit-form kit-lux co-name">
        <label className="f" htmlFor="co-name" style={{ marginTop: 14 }}>Name</label>
        <input id="co-name" name="company" defaultValue={profile.company} placeholder="e.g. Lumen Labs" autoComplete="organization" maxLength={80} />
        <p className="kit-note">Shown under your name on your card and pages.</p>
        <button>Save name</button>
      </form>

      <h3 className="kit-sec" id="brand">Logo and colours</h3>
      <BrandForm action={saveBrand} company={profile.company} logoSrc={profile.logo ? `/logo/${profile.handle}?v=${encodeURIComponent(profile.logo)}` : ""} color1={themeOf(profile.theme).from} color2={themeOf(profile.theme).to} />

      <h3 className="kit-sec" id="team">Team<span>{team.length}</span></h3>
      {team.length === 0 && <div className="kit-empty">No team members yet. People you add appear on your pages.</div>}
      {team.map((m) => {
        const lp = linked.find((x) => x.handle === m.memberHandle);
        return (
          <div className="cs-saved co-member" key={m.id}>
            <Avatar name={lp?.name ?? m.name} handle={lp?.handle ?? ""} hasPhoto={!!lp?.photo} avatar={lp?.avatar ?? ""} size={44} />
            <div className="co-who">
              <b>{lp?.name ?? m.name}{m.memberHandle && <em>@{m.memberHandle}</em>}</b>
              <span>{m.role || lp?.headline || "No role yet"}{m.link && !m.memberHandle ? " · " + m.link.replace(/^https?:\/\//, "") : ""}</span>
            </div>
            <form action={delMember}><input type="hidden" name="id" value={m.id} /><button className="doc-del" aria-label={`Remove ${lp?.name ?? m.name}`}>Remove</button></form>
          </div>
        );
      })}

      <form action={addMember} className="card kit-form kit-lux co-add">
        <div className="kit-lux-top">
          <i className="kit-lux-ic" aria-hidden><Icon name="plus" size={24} /></i>
          <div>
            <b>Add a team member</b>
            <span>By their TapNodd username, or by hand</span>
          </div>
        </div>
        <label className="f" htmlFor="co-user" style={{ marginTop: 0 }}>TapNodd username</label>
        <input id="co-user" name="username" placeholder="e.g. priya-nair" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        <p className="kit-note">Fills in their name and photo, and links to their page.</p>
        <label className="f" htmlFor="co-role">Role</label>
        <input id="co-role" name="role" placeholder="e.g. CTO" maxLength={60} />
        <details className="doc-more co-manual">
          <summary><span>Not on TapNodd? Add them by hand</span><em /></summary>
          <div className="doc-opt">
            <label className="doc-opt-t" htmlFor="co-mname">Name</label>
            <div className="doc-line"><input id="co-mname" name="name" placeholder="Their full name" maxLength={80} /></div>
            <label className="doc-opt-t" htmlFor="co-link" style={{ marginTop: 10 }}>Link</label>
            <div className="doc-line"><input id="co-link" name="link" placeholder="LinkedIn or portfolio" inputMode="url" autoCapitalize="none" /></div>
          </div>
        </details>
        <button>Add member</button>
      </form>
    </div>
  );
}

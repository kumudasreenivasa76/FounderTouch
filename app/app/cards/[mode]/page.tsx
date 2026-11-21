import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import { byline } from "@/lib/look";
import Avatar from "@/components/avatar";
import Logo from "@/components/logo";
import PageHead from "@/components/page-head";
import { saveCard } from "../actions";
import { SECTIONS } from "@/lib/card-sections";
import SlugField from "./slug-field";
export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Card" };

const ERR: Record<string, string> = { name: "Give the card a name.", slug: "Use 3 to 30 letters, numbers or dashes for the address.", taken: "That address is taken. Try another." };

/** Edit Card & Custom URL (design 13). */
export default async function EditCard({ params, searchParams }: { params: Promise<{ mode: string }>; searchParams: Promise<{ err?: string; try?: string }> }) {
  const { profile } = await requireOwner();
  const { mode } = await params;
  const sp = await searchParams;
  if (!(MODES as readonly string[]).includes(mode)) notFound();
  const [cfg, slug] = await Promise.all([
    db.modeConfig.findFirst({ where: { profileId: profile.id, mode } }),
    db.cardSlug.findFirst({ where: { profileId: profile.id, mode } }),
  ]);
  if (!cfg) notFound();
  // A mode that is switched off has no public card yet, so send the person to turn it on first.
  if (!cfg.isEnabled) redirect(`/app/card?pane=add`);
  const hidden = new Set(cfg.hidden.split(",").filter(Boolean));
  const label = mode === "ALL" ? "Complete Profile" : MODE_INFO[mode as Mode].label;
  return (
    <>
      <PageHead title="Edit Card" back="/app/cards" error={sp.err ? ERR[sp.err] : undefined} />
      <div className="d-hero d-editcard">
        <span className="d-ec-brand"><Logo size={18} />TapNodd</span>
        <div className="d-ec-who">
          <Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} size={58} />
          <span><b>{profile.name}</b>{profile.headline && <small>{profile.headline}</small>}{profile.company && !byline(profile.headline, "").includes(profile.company) && <small>{profile.company}</small>}</span>
        </div>
        <span className="d-ec-mode">{label}</span>
      </div>
      <form action={saveCard} className="d-form">
        <input type="hidden" name="mode" value={mode} />
        <span className="d-ob-l">Card URL (Your TapNodd Link)</span>
        <SlugField initial={sp.try ?? slug?.slug ?? ""} fallback={`${profile.handle}/${mode === "ALL" ? "card" : MODE_INFO[mode as Mode].label.toLowerCase()}`} />
        <label className="d-ob-l" htmlFor="cardName">Card Name <span style={{ color: "#E11D48" }}>*</span></label>
        <input id="cardName" name="cardName" required maxLength={40} defaultValue={cfg.cardName || `${label} Card`} />
        <span className="d-ob-l">Visible Sections</span>
        <div className="d-checks">
          {SECTIONS.map(([k, l]) => (
            <label key={k} className="d-check"><input type="checkbox" name="show" value={k} defaultChecked={!hidden.has(k)} /><span className="d-box" aria-hidden><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span>{l}</label>
          ))}
        </div>
        <button className="d-next" style={{ marginTop: 18 }}>Save Changes</button>
      </form>
    </>
  );
}

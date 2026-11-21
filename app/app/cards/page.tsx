import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MODE_INFO, Mode, modeSlug } from "@/lib/modes";
import Icon from "@/components/icon";
import BackLink from "@/components/back-link";
export const dynamic = "force-dynamic";
export const metadata = { title: "My Cards" };

const ICON: Record<string, string> = { ALL: "card", NORMAL: "user", FOUNDER: "rocket", INVESTOR: "coins", SERVICES: "store", RECRUITER: "target", OTHER: "spark" };
const SUB: Record<string, string> = { ALL: "My Complete Profile", NORMAL: "Personal Profile", FOUNDER: "Startup & Products", INVESTOR: "Investment Profile", SERVICES: "Products & Services", RECRUITER: "Hiring & Talent", OTHER: "Custom Card" };

/** My Cards (design 12): one card per mode, each with its own address. */
export default async function MyCards({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { profile } = await requireOwner();
  const sp = await searchParams;
  const [cfgs, slugs] = await Promise.all([
    db.modeConfig.findMany({ where: { profileId: profile.id, isEnabled: true } }),
    db.cardSlug.findMany({ where: { profileId: profile.id } }),
  ]);
  const order = ["ALL", ...MODES.filter((m) => m !== "ALL")];
  const cards = order.map((m) => cfgs.find((c) => c.mode === m)).filter((c): c is NonNullable<typeof c> => !!c);
  const addr = (m: string) => slugs.find((s) => s.mode === m)?.slug ?? `${profile.handle}/${modeSlug(m)}`;
  return (
    <>
      <div className="tn-top"><BackLink href="/app/profile" /></div>
      {sp.saved && <div className="ok">Saved</div>}
      <h1 className="d-h1" style={{ marginTop: 0 }}>My TapNodd Cards</h1>
      <p className="d-sub">Create and manage your digital identities for different purposes.</p>
      {cards.map((c, i) => (
        <div key={c.id} className={i === 0 ? "d-cardrow d-cardrow-p" : "d-cardrow"}>
          <span className="d-cr-ico" style={i === 0 ? undefined : { color: `var(--m-${c.mode.toLowerCase()}, #6D28D9)` }} aria-hidden><Icon name={ICON[c.mode] ?? "card"} size={i === 0 ? 24 : 28} /></span>
          <Link href={`/app/cards/${c.mode}`} className="d-grow">
            <b>TapNodd/{addr(c.mode)}</b>
            <span>{c.cardName || SUB[c.mode] || MODE_INFO[c.mode as Mode]?.label}</span>
          </Link>
          {i === 0 && <span className="d-cr-tag">Primary</span>}
          <Link href={`/app/share?mode=${c.mode}`} className="d-ibtn" aria-label={`Share ${c.cardName || MODE_INFO[c.mode as Mode]?.label} card`}><Icon name="share" size={18} /></Link>
          <Link href={`/app/cards/${c.mode}`} className="d-ibtn" aria-label={`Edit ${c.cardName || MODE_INFO[c.mode as Mode]?.label} card`}><Icon name="more" size={18} /></Link>
        </div>
      ))}
      <Link href="/app/card?pane=add" className="d-next" style={{ marginTop: 18 }}><Icon name="plus" size={20} />&nbsp;Create New Card</Link>
    </>
  );
}

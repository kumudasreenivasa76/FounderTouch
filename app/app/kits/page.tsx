import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import Icon from "@/components/icon";
import PageHead from "@/components/page-head";
export const dynamic = "force-dynamic";
export const metadata = { title: "Kits" };

const KITS = [
  { mode: "FOUNDER", title: "Pitch Kit", sub: "For investors & accelerators", icon: "rocket", tint: "" },
  { mode: "INVESTOR", title: "Investor Kit", sub: "For fundraising & updates", icon: "coins", tint: "g" },
  { mode: "SERVICES", title: "Product Kit", sub: "For customers & partners", icon: "store", tint: "b" },
  { mode: "RECRUITER", title: "Hiring Kit", sub: "For candidates & job fairs", icon: "target", tint: "o" },
  { mode: "NORMAL", title: "Company Kit", sub: "For media, press & events", icon: "building", tint: "o" },
  { mode: "OTHER", title: "Custom Kit", sub: "Anything else you share often", icon: "kit", tint: "" },
];

/** Kits, manage and create (design 19): each kit is the set of files and links behind one card. */
export default async function Kits({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { profile } = await requireOwner();
  const t = (await searchParams).t === "templates" ? "templates" : "mine";
  const [cfgs, res] = await Promise.all([
    db.modeConfig.findMany({ where: { profileId: profile.id } }),
    db.resource.findMany({ where: { profileId: profile.id }, select: { modes: true, createdAt: true } }),
  ]);
  const items = (m: string) => res.filter((r) => r.modes.split(",").includes(m));
  const mine = KITS.filter((k) => { const c = cfgs.find((x) => x.mode === k.mode); return !!c && c.isEnabled && (c.added || items(k.mode).length > 0); });
  const rest = KITS.filter((k) => !mine.includes(k));
  const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const list = t === "mine" ? mine : rest;
  return (
    <>
      <PageHead title="Kits" back="/app/profile" />
      <nav className="d-tabs" aria-label="Kits">
        <Link href="/app/kits" aria-current={t === "mine" ? "page" : undefined}>My Kits ({mine.length})</Link>
        <Link href="/app/kits?t=templates" aria-current={t === "templates" ? "page" : undefined}>Templates ({rest.length})</Link>
      </nav>
      {list.length === 0 && <div className="d-empty"><b>{t === "mine" ? "No kits yet" : "You have every kit"}</b>{t === "mine" ? "Start one from Templates." : "Open a kit from My Kits to add files and links."}</div>}
      {list.map((k) => {
        const its = items(k.mode);
        const last = its.reduce<Date | null>((a, r) => (!a || r.createdAt > a ? r.createdAt : a), null);
        return (
          <Link key={k.mode} href={`/app/profile/kit?mode=${k.mode}`} className="d-li">
            <span className={`d-ico ${k.tint}`} aria-hidden style={{ width: 44, height: 44 }}><Icon name={k.icon} /></span>
            <span><b>{k.title}</b><span>{k.sub}</span>{t === "mine" && <span style={{ fontSize: 12 }}>{its.length} item{its.length === 1 ? "" : "s"}{last ? ` · Updated ${day(last)}` : ""}</span>}</span>
            {t === "templates" ? <span className="d-pill">Use</span> : <span className="d-chev" aria-hidden><Icon name="chev" /></span>}
          </Link>
        );
      })}
      {t === "mine" && <Link href="/app/kits?t=templates" className="d-soft"><span className="d-pl" aria-hidden><Icon name="plus" size={15} /></span>Create New Kit</Link>}
    </>
  );
}

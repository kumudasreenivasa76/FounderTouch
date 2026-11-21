import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import PageHead from "@/components/page-head";
import { logout } from "../profile/actions";
import Icon from "@/components/icon";
import Avatar from "@/components/avatar";
import { db } from "@/lib/db";
import { modeHasContent } from "@/lib/mode-content";
import PreviewLink from "@/components/preview-link";
import ThemeSwitch from "@/components/theme-switch";
import { cookies } from "next/headers";
export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

type Item = { href: string; icon: string; title: string; sub: string };
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "Account", items: [
    { href: "/app/settings", icon: "shield", title: "Privacy & Visibility", sub: "Card colour, logo and who needs your approval" },
    { href: "/app/card?pane=add", icon: "grid", title: "Manage Modes", sub: "" },
    { href: "/app/cards", icon: "link", title: "My Cards & Links", sub: "" },
    { href: "/app/integrations", icon: "plug", title: "Integrations", sub: "(Zapier, Make, Slack, API key)" },
  ] },
  { title: "Your modes", items: [
    { href: "/app/profile/kit?mode=FOUNDER", icon: "rocket", title: "Founder kit", sub: "" },
    { href: "/app/deals", icon: "coins", title: "Investor deal flow", sub: "" },
    { href: "/app/catalog", icon: "store", title: "Seller catalog", sub: "" },
    { href: "/app/hire", icon: "target", title: "Recruiting", sub: "" },
  ] },
  { title: "Workspace", items: [
    { href: "/app/opportunities", icon: "spark", title: "Opportunities", sub: "" },
    { href: "/app/events", icon: "calendar", title: "Events", sub: "" },
    { href: "/app/tools", icon: "tools", title: "Tools", sub: "(Signature, backgrounds, booth mode)" },
    { href: "/app/nfc", icon: "nfc", title: "NFC Tags", sub: "" },
    { href: "/app/card?pane=wallet", icon: "wallet", title: "Wallet & Saved Cards", sub: "" },
    { href: "/app/org", icon: "building", title: "Team", sub: "" },
    { href: "/dashboard", icon: "chart", title: "Desktop Dashboard", sub: "(Opens in a new tab)" },
  ] },
];

export default async function More() {
  const { profile } = await requireOwner();
  // Recruiting only appears once the Recruiter mode has been added.
  const [cfg, resources, jobs] = await Promise.all([
    db.modeConfig.findFirst({ where: { profileId: profile.id, mode: "RECRUITER" } }),
    db.resource.findMany({ where: { profileId: profile.id }, select: { modes: true } }),
    db.job.count({ where: { profileId: profile.id, open: true } }),
  ]);
  const recruiterOn = !!cfg?.isEnabled && modeHasContent("RECRUITER", cfg, resources, { projects: 0, events: 0, jobs });
  // Recruiting is always listed; the hiring screen offers to turn the Recruiter mode on when it is off.
  void recruiterOn;
  const groups = GROUPS;
  const t = (await cookies()).get("theme")?.value;
  const themePref = t === "dark" || t === "system" ? t : "light";
  const modeOf = (href: string) => href.includes("FOUNDER") ? "m-FOUNDER" : href === "/app/deals" ? "m-INVESTOR" : href === "/app/catalog" ? "m-SERVICES" : href === "/app/hire" ? "m-RECRUITER" : "";
  return (
    <>
      <PageHead title="Settings" back="/app/profile" />
      <div className="d-card d-me">
        <Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} size={52} />
        <span className="d-grow"><span className="d-t1" style={{ fontSize: 16 }}>{profile.name}</span><span className="d-t2">TapNodd/{profile.handle}</span></span>
      </div>
      {groups.map((g) => (
        <section key={g.title} aria-labelledby={`g-${g.title}`}>
          <h2 id={`g-${g.title}`} className="d-cap">{g.title}</h2>
          <div className="d-list">
            {g.items.map((i) => (
              <Link key={i.href} href={i.href} className={`d-srow ${modeOf(i.href)}`} {...(i.href.startsWith("/dashboard") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                <span className="d-sico" aria-hidden style={modeOf(i.href) ? { color: "var(--mode)" } : undefined}><Icon name={i.icon} /></span>
                <span className="d-grow"><span className="d-t1">{i.title}</span>{i.sub && <span className="d-t2">{i.sub}</span>}</span>
                <span className="d-chev" aria-hidden><Icon name="chev" /></span>
              </Link>
            ))}
            {g.title === "Account" && (
              <div className="d-srow theme-row">
                <span className="d-sico" aria-hidden><Icon name="palette" /></span>
                <span className="d-grow" style={{ flex: "1 1 120px" }}><span className="d-t1">Appearance</span><span className="d-t2">Auto follows your phone</span></span>
                <ThemeSwitch initial={themePref} />
              </div>
            )}
          </div>
        </section>
      ))}
      <h2 className="d-cap">Support</h2>
      <div className="d-list">
        <PreviewLink className="d-srow" href={`/${profile.handle}`} title="My public page">
          <span className="d-sico" aria-hidden><Icon name="globe" /></span>
          <span className="d-grow"><span className="d-t1">View My Public Page</span><span className="d-t2">/{profile.handle}</span></span>
          <span className="d-chev" aria-hidden><Icon name="chev" /></span>
        </PreviewLink>
        <a className="d-srow" href="mailto:hello@tapnodd.com"><span className="d-sico" aria-hidden><Icon name="help" /></span><span className="d-grow"><span className="d-t1">Help &amp; Support</span></span><span className="d-chev" aria-hidden><Icon name="chev" /></span></a>
        <form action={logout} className="d-srow-f"><button className="d-srow d-out" type="submit"><span className="d-sico" aria-hidden><Icon name="logout" /></span><span className="d-grow"><span className="d-t1">Log Out</span></span></button></form>
      </div>
    </>
  );
}

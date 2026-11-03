import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import PageHead from "@/components/page-head";
import { logout } from "../profile/actions";
import Icon from "@/components/icon";
import { db } from "@/lib/db";
import { modeHasContent } from "@/lib/mode-content";
export const dynamic = "force-dynamic";
export const metadata = { title: "More" };

type Item = { href: string; icon: string; title: string; sub: string };
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "Share", items: [
    { href: "/app/integrations", icon: "plug", title: "Integrations", sub: "Zapier, Make, Slack and an API key" },
    { href: "/app/nfc", icon: "nfc", title: "NFC tags", sub: "Choose which mode each tag opens" },
    { href: "/app/tools", icon: "tools", title: "Tools", sub: "Email signature, video background, booth mode" },
    { href: "/app/card?pane=wallet", icon: "wallet", title: "Wallet", sub: "Add your card to your phone, and see saved cards" },
  ] },
  { title: "Grow", items: [
    { href: "/dashboard", icon: "chart", title: "CRM dashboard", sub: "Desktop view of every mode: contacts, pipeline, follow-ups" },
    { href: "/app/org", icon: "building", title: "Team & enterprise", sub: "Brand kit, directory, team analytics and leads" },
    { href: "/app/events", icon: "calendar", title: "Events", sub: "Registration, check-in, meals and recruiting" },
    { href: "/app/hire", icon: "search", title: "Recruiting", sub: "Post roles, manage candidates, find talent" },
    { href: "/app/profile/work", icon: "briefcase", title: "Hire me", sub: "Your own profile for recruiters" },
  ] },
  { title: "Account", items: [
    { href: "/app/profile/kit?mode=FOUNDER&tab=brand", icon: "settings", title: "Settings", sub: "Company logo and colours" },
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
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.href !== "/app/hire" || recruiterOn) }));
  return (
    <>
      <PageHead title="More" sub="Everything else, grouped by what you want to do." back="/app" />
      {groups.map((g) => (
        <section key={g.title} aria-labelledby={`g-${g.title}`}>
          <h2 id={`g-${g.title}`} style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: ".05em", color: "#566074", margin: "16px 0 8px" }}>{g.title}</h2>
          {g.items.map((i) => (
            <Link key={i.href} href={i.href} className="menu-row">
              <span className="menu-ico" aria-hidden><Icon name={i.icon} /></span>
              <span style={{ flex: 1, minWidth: 0 }}><b>{i.title}</b><span className="muted" style={{ display: "block" }}>{i.sub}</span></span>
              <span className="muted" aria-hidden>›</span>
            </Link>
          ))}
        </section>
      ))}
      <a className="menu-row" href={`/${profile.handle}`} target="_blank" rel="noopener noreferrer">
        <span className="menu-ico" aria-hidden>↗</span>
        <span style={{ flex: 1 }}><b>View my public page</b><span className="muted" style={{ display: "block" }}>/{profile.handle} · opens in a new tab</span></span>
      </a>
      <form action={logout} style={{ marginTop: 16 }}><button className="ghost">Log out</button></form>
    </>
  );
}

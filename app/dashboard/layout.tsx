import Link from "next/link";
import { Suspense } from "react";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { MODES, MODE_INFO } from "@/lib/modes";
import { membership } from "@/lib/org";
import Avatar from "@/components/avatar";
import Logo from "@/components/logo";
import DashNav, { type NavGroup } from "@/components/dash-nav";
import ThemeSwitch from "@/components/theme-switch";
import { cookies } from "next/headers";
import "./dashboard.css";
import "./dashboard-light.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

/** Phone-app screens open inside the dashboard's workspace, so nothing here sends you away from it. */
const w = (path: string) => `/dashboard/w${path}`;

/** Desktop dashboard: every part of TapNodd in one place, with analytics and a CRM view per card. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireOwner();
  const t = (await cookies()).get("theme")?.value;
  const themePref = t === "dark" || t === "system" ? t : "light";
  const [counts, inbox, team] = await Promise.all([
    db.contact.groupBy({ by: ["mode"], where: { profileId: profile.id, status: { not: "BLOCKED" } }, _count: true }),
    db.contact.count({ where: { profileId: profile.id, status: "PENDING" } }),
    membership(user.id),
  ]);
  const per = Object.fromEntries(counts.map((c) => [c.mode, c._count]));
  const total = Object.values(per).reduce((a, b) => a + b, 0);

  const groups: NavGroup[] = [
    { title: "Overview", items: [
      { href: "/dashboard", label: "Home", icon: "home" },
      { href: "/dashboard/features", label: "All features", icon: "spark" },
    ] },
    { title: "Share", items: [
      { href: "/dashboard/cards", label: "Cards", icon: "card" },
      { href: w("/app/card"), label: "QR, tap and scan", icon: "qr" },
      { href: w("/app/links"), label: "Link page", icon: "link" },
      { href: w("/app/profile/kit"), label: "Kits", icon: "folder" },
      { href: w("/app/nfc"), label: "NFC tags", icon: "nfc" },
    ] },
    { title: "People", items: [
      { href: "/dashboard/all", label: "All contacts", icon: "users", n: total },
      { href: w("/app/contacts/inbox"), label: "Inbox", icon: "mail", n: inbox },
      { href: w("/app/contacts/import"), label: "Import contacts", icon: "download" },
    ] },
    { title: "CRM by card", items: MODES.filter((m) => m !== "ALL").map((m) => ({ href: `/dashboard/${m.toLowerCase()}`, label: MODE_INFO[m].label, mode: m, n: per[m] ?? 0 })) },
    { title: "Grow", items: [
      { href: w("/app/opportunities"), label: "Opportunities", icon: "spark" },
      { href: w("/app/deals"), label: "Deal flow", icon: "coins" },
      { href: w("/app/catalog"), label: "Catalog", icon: "store" },
      { href: w("/app/events"), label: "Events", icon: "calendar" },
      { href: w("/app/hire"), label: "Recruiting", icon: "target" },
      { href: w("/app/org"), label: team ? team.org.name : "Team", icon: "building" },
      ...(team ? [{ href: w("/app/org/leaderboard"), label: "Leaderboard", icon: "trophy" }] : []),
      { href: w("/app/integrations"), label: "Integrations", icon: "plug" },
    ] },
    { title: "Studio", items: [
      { href: "/dashboard/signature", label: "Email signature", icon: "mail" },
      { href: "/dashboard/backgrounds", label: "Virtual background", icon: "video" },
    ] },
    { title: "You", items: [
      { href: w("/app/profile/details"), label: "About you", icon: "user" },
      { href: w("/app/profile/contact"), label: "Contact and socials", icon: "phone" },
      { href: w("/app/profile/company"), label: "Company and brand", icon: "building" },
      { href: w("/app/profile/work"), label: "Experience & skills", icon: "briefcase" },
    ] },
  ];

  return (
    <div className="dash">
      <aside className="dash-side">
        <Link href="/dashboard" className="dash-brand"><Logo size={28} /><span className="brand-word">Tap<span>Nodd</span></span></Link>
        <Suspense fallback={null}><DashNav groups={groups} /></Suspense>
        <div className="dash-me">
          <Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={38} />
          <div><b>{profile.name}</b><span>/{profile.handle}</span></div>
        </div>
        <div className="dash-theme"><ThemeSwitch initial={themePref} /></div>
        <div className="dash-foot">
          <a href={`/${profile.handle}`} target="_blank" rel="noopener noreferrer">View my page</a>
          <a href="/app" target="_blank" rel="noopener noreferrer">Phone app</a>
          <a href="/app/contacts/export?format=csv">Export</a>
        </div>
      </aside>
      <main className="dash-main">{children}</main>
    </div>
  );
}

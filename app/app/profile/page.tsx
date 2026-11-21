import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { parseSocials } from "@/lib/socials";
import { MODE_INFO, modeSlug, Mode } from "@/lib/modes";
import { byline } from "@/lib/look";
import Avatar from "@/components/avatar";
import Icon from "@/components/icon";
export const dynamic = "force-dynamic";
export const metadata = { title: "My Profile" };

/** My Profile: every part of your profile in one list, as in the design. */
export default async function MyProfile() {
  const { profile } = await requireOwner();
  const [projects, resources, career, cfgs] = await Promise.all([
    db.project.count({ where: { profileId: profile.id, eventId: null } }),
    db.resource.findMany({ where: { profileId: profile.id }, select: { kind: true } }),
    db.careerItem.count({ where: { profileId: profile.id } }),
    db.modeConfig.findMany({ where: { profileId: profile.id, isEnabled: true }, select: { mode: true } }),
  ]);
  const socials = Object.values(parseSocials(profile.socials)).filter(Boolean).length + (profile.website ? 1 : 0);
  const modes = cfgs.map((c) => c.mode as Mode).filter((m) => MODE_INFO[m]);
  const rows = [
    { href: "/app/profile/details", icon: "user", t: "About You", s: byline(profile.name, profile.headline) || "Name, photo, headline and bio" },
    { href: "/app/profile/contact", icon: "phone", t: "Contact & Socials", s: [profile.phone, socials ? `${socials} link${socials === 1 ? "" : "s"}` : ""].filter(Boolean).join(" • ") || "Phone, email and links" },
    { href: "/app/profile/company", icon: "building", t: "Company", s: profile.company || "Company name, logo and team" },
    { href: "/app/profile/work", icon: "briefcase", t: "Experience & Skills", s: career ? `${career} item${career === 1 ? "" : "s"} · resume and skills` : "Resume, portfolio, experience" },
    { href: "/app/kits", icon: "kit", t: "Kits", s: resources.length ? `${resources.length} item${resources.length === 1 ? "" : "s"} across your modes` : "Pitch Kit, Investor Kit, Company Kit" },
    { href: "/app/profile/projects", icon: "rocket", t: "Projects", s: `${projects} project${projects === 1 ? "" : "s"}` },
    { href: "/app/cards", icon: "card", t: "My Cards", s: modes.length ? modes.map((m) => `TapNodd/${modeSlug(m)}`).slice(0, 3).join(", ") : "Your card for each mode" },
    { href: "/app/links", icon: "link", t: "Link Page", s: `tapnodd.com/${profile.handle}` },
  ];
  return (
    <>
      <div className="d-ph">
        <h1 className="d-h1" style={{ margin: 0 }}>My Profile</h1>
        <span style={{ display: "flex", gap: 8 }}>
          <Link href="/app/more" className="d-ibtn" aria-label="Settings" style={{ color: "var(--ink)" }}><Icon name="settings" size={22} /></Link>
          <Link href="/app/profile/details" className="d-fab" aria-label="Edit profile"><Icon name="edit" /></Link>
        </span>
      </div>
      <Link href={`/${profile.handle}`} className="d-card d-me">
        <Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} size={56} />
        <span className="d-grow"><span className="d-t1" style={{ fontSize: 16 }}>{profile.name}</span><span className="d-t2">tapnodd.com/{profile.handle}</span></span>
        <span className="d-chip">View</span>
      </Link>
      {rows.map((r) => (
        <Link key={r.href} href={r.href} className="d-li">
          <span className="d-ico" aria-hidden><Icon name={r.icon} /></span>
          <span><b>{r.t}</b><span>{r.s}</span></span>
          <span className="d-chev" aria-hidden><Icon name="chev" /></span>
        </Link>
      ))}
    </>
  );
}

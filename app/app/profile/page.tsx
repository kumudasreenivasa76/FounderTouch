import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { parseSocials } from "@/lib/socials";
import { byline } from "@/lib/look";
import { MODES, MODE_INFO } from "@/lib/modes";
import { modeHasContent } from "@/lib/mode-content";
import Avatar from "@/components/avatar";
import { logout, uploadPhoto } from "./actions";
import PhotoUpload from "@/components/photo-upload";
export const dynamic = "force-dynamic";

export default async function ProfileHub() {
  const { user, profile } = await requireOwner();
  const [resources, team, sections, projectCount, cfgs, eventCount, jobCount, careerN] = await Promise.all([
    db.resource.findMany({ where: { profileId: profile.id }, select: { kind: true, modes: true } }),
    db.teamMember.count({ where: { profileId: profile.id } }),
    db.section.count({ where: { profileId: profile.id } }),
    db.project.count({ where: { profileId: profile.id, eventId: null } }),
    db.modeConfig.findMany({ where: { profileId: profile.id } }),
    db.event.count({ where: { profileId: profile.id } }),
    db.job.count({ where: { profileId: profile.id, open: true } }),
    db.careerItem.count({ where: { profileId: profile.id } }),
  ]);
  const visible = MODES.filter((m) => cfgs.find((c) => c.mode === m)?.isEnabled && modeHasContent(m, cfgs.find((c) => c.mode === m), resources, { projects: projectCount, events: eventCount, jobs: jobCount, career: careerN + (profile.skills.trim() || profile.openTo ? 1 : 0) }));
  const n = (k: string) => resources.filter((r) => r.kind === k).length;
  const socials = Object.values(parseSocials(profile.socials)).filter(Boolean).length;
  const hasLook = !!profile.photo || !!profile.avatar;

  // Each step: done?, label, where to fix it
  const steps = [
    { ok: hasLook, label: "Add a photo or avatar", href: "/app/profile/avatar" },
    { ok: !!profile.headline, label: "Write a headline", href: "/app/profile/details" },
    { ok: !!profile.bio, label: "Write a short bio", href: "/app/profile/details" },
    { ok: !!profile.phone || !!profile.email, label: "Add a phone or email", href: "/app/profile/contact" },
    { ok: socials > 0, label: "Add a social link", href: "/app/profile/contact" },
    { ok: !!profile.company, label: "Add your company name", href: "/app/profile/company" },
    { ok: team > 0, label: "Add a team member", href: "/app/profile/company" },
    { ok: !!profile.product, label: "Describe your product", href: "/app/profile/kit" },
    { ok: n("DECK") > 0, label: "Add a pitch deck", href: "/app/profile/kit?kind=DECK#add" },
    { ok: n("DEMO") > 0, label: "Add a product demo", href: "/app/profile/kit?kind=DEMO#add" },
  ];
  const doneCount = steps.filter((s) => s.ok).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const next = steps.find((s) => !s.ok);

  const rows = [
    { href: "/app/profile/details", icon: "👤", title: "Basic details", sub: [profile.name, profile.headline].filter(Boolean).join(" · ") || "Name, headline, bio, photo" },
    { href: "/app/profile/contact", icon: "📇", title: "Contact & socials", sub: `${profile.phone || profile.email ? "Phone/email set" : "No phone or email"} · ${socials} social link${socials === 1 ? "" : "s"}` },
    { href: "/app/profile/company", icon: "🏢", title: "Company", sub: `${profile.company || "No company name"} · ${team} team member${team === 1 ? "" : "s"}` },
    { href: "/app/profile/work", icon: "💼", title: "Hire me", sub: `Resume, portfolio, experience, education` },
    { href: "/app/profile/kit", icon: "🚀", title: "Kits", sub: `Founder, Investor, Seller… · ${resources.length} item${resources.length === 1 ? "" : "s"}` },
    { href: "/app/profile/sections", icon: "📝", title: "Text blocks & projects", sub: `${sections} text block${sections === 1 ? "" : "s"} · ${projectCount} project${projectCount === 1 ? "" : "s"}` },
  ];

  return (
    <>
      <div className="card hero" style={{ marginBottom: 12 }}>
        <PhotoUpload action={uploadPhoto} size={84} center><Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={84} /></PhotoUpload>
        <h1>{profile.name}</h1>
        <div className="muted">{byline(profile.headline, profile.company) || "Add a headline"}</div>
        <div className="muted" style={{ marginBottom: 10 }}>{user.email}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {visible.map((m) => <a key={m} className="btn" style={{ width: "auto", padding: "8px 14px" }} href={`/${profile.handle}?mode=${m}`} target="_blank">{MODE_INFO[m].icon} {MODE_INFO[m].label} ↗</a>)}
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between" }}><b>Profile {pct}% complete</b><span className="muted">{doneCount}/{steps.length}</span></div>
        <div className="meter"><i style={{ width: `${pct}%` }} /></div>
        {next ? <Link href={next.href} className="muted">Next: {next.label} →</Link> : <span className="muted">All set. Your page is ready to share 🎉</span>}
      </div>

      {rows.map((r) => (
        <Link key={r.href} href={r.href} className="menu-row">
          <span className="menu-ico">{r.icon}</span>
          <span style={{ flex: 1, minWidth: 0 }}><b>{r.title}</b><span className="muted" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sub}</span></span>
          <span className="muted">›</span>
        </Link>
      ))}

      <form action={logout} style={{ marginTop: 16 }}><button className="ghost">Log out</button></form>
    </>
  );
}

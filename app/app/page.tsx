import Link from "next/link";
import { db } from "@/lib/db";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import { requireOwner } from "@/lib/auth";
import { modeHasContent } from "@/lib/mode-content";
import { SOCIALS, parseSocials } from "@/lib/socials";
import { byline, gradient, themeOf } from "@/lib/look";
import Avatar from "@/components/avatar";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { SaveOfflineCard } from "@/components/offline-card";
import ToggleSwitch from "@/components/toggle-switch";
import { toggleHire } from "./modes/actions";
import ModeDropdown from "@/components/mode-dropdown";
import PhotoUpload from "@/components/photo-upload";
import { CardLine } from "@/components/digital-card";
import CardWithShare from "@/components/card-with-share";
import { SocialIcon } from "@/components/social-icon";
import { uploadPhoto, logout } from "./profile/actions";
import Icon from "@/components/icon";
export const dynamic = "force-dynamic";
export const metadata = { title: "Home" };

/** Home: how complete your profile is, your card, the three things you do most, and what needs attention. */
export default async function Home() {
  const { profile } = await requireOwner();
  const [cfgs, resources, projectRows, eventCount, jobCount, careerN, upcoming, team] = await Promise.all([
    db.modeConfig.findMany({ where: { profileId: profile.id } }),
    db.resource.findMany({ where: { profileId: profile.id }, select: { kind: true, modes: true } }),
    db.project.findMany({ where: { profileId: profile.id, eventId: null }, select: { modes: true } }),
    db.event.count({ where: { profileId: profile.id } }),
    db.job.count({ where: { profileId: profile.id, open: true } }),
    db.careerItem.count({ where: { profileId: profile.id } }),
    db.event.findMany({ where: { profileId: profile.id, OR: [{ startsAt: null }, { startsAt: { gte: new Date() } }] }, orderBy: { startsAt: "asc" }, take: 3, include: { _count: { select: { attendees: true } } } }),
    db.teamMember.count({ where: { profileId: profile.id } }),
  ]);
  const projectModes = projectRows.flatMap((r) => r.modes.split(",").filter(Boolean));
  const hireBits = careerN + (profile.skills.trim() || profile.openTo ? 1 : 0);
  const extra = { projects: projectRows.length, events: eventCount, jobs: jobCount, career: hireBits, projectModes };
  const visible = MODES.filter((m) => cfgs.find((c) => c.mode === m)?.isEnabled && modeHasContent(m, cfgs.find((c) => c.mode === m), resources, extra));

  const hireOn = visible.includes("HIRE");
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const [dueCount, pendingCount] = await Promise.all([
    db.contact.count({ where: { profileId: profile.id, status: "CONNECTED", followUpAt: { lte: endOfToday } } }),
    db.contact.count({ where: { profileId: profile.id, status: "PENDING" } }),
  ]);
  const socials = parseSocials(profile.socials);
  const n = (k: string) => resources.filter((r) => r.kind === k).length;
  const socialCount = Object.values(socials).filter(Boolean).length;
  const steps = [
    { ok: !!profile.photo || !!profile.avatar, label: "Add a photo or avatar", href: "/app/profile/avatar" },
    { ok: !!profile.headline, label: "Write a headline", href: "/app/profile/details" },
    { ok: !!profile.bio, label: "Write a short bio", href: "/app/profile/details" },
    { ok: !!(profile.phone || profile.email), label: "Add a phone or email", href: "/app/profile/contact" },
    { ok: socialCount > 0, label: "Add a social link", href: "/app/profile/contact" },
    { ok: !!profile.company, label: "Add your company name", href: "/app/profile/company" },
    { ok: team > 0, label: "Add a team member", href: "/app/profile/company" },
    { ok: !!profile.product, label: "Describe your product", href: "/app/profile/kit" },
    { ok: n("DECK") > 0, label: "Add a pitch deck", href: "/app/profile/kit?kind=DECK#add" },
    { ok: visible.length > 0, label: "Fill in a mode", href: "/app/card?pane=add" },
  ];
  const rows = [
    { href: "/app/profile/details", icon: "user", title: "About you", sub: [profile.name, profile.headline].filter(Boolean).join(" · ") || "Name, headline, bio and photo" },
    { href: "/app/profile/contact", icon: "phone", title: "Contact & socials", sub: `${profile.phone || profile.email ? "Phone/email set" : "No phone or email"} · ${socialCount} social link${socialCount === 1 ? "" : "s"}` },
    { href: "/app/profile/company", icon: "building", title: "Company", sub: `${profile.company || "No company name"} · ${team} team member${team === 1 ? "" : "s"}` },
    { href: "/app/profile/work", icon: "briefcase", title: "Hire me", sub: "Resume, portfolio, experience, education" },
    { href: "/app/profile/kit", icon: "folder", title: "Kits", sub: `Founder, Investor, Seller… · ${resources.length} item${resources.length === 1 ? "" : "s"}` },
    { href: "/app/profile/projects", icon: "spark", title: "Projects", sub: projectRows.length ? `${projectRows.length} project${projectRows.length === 1 ? "" : "s"} you have built` : "Show what you have built" },
  ];
  const pct = Math.round((steps.filter((s) => s.ok).length / steps.length) * 100);
  const next = steps.find((s) => !s.ok);

  const origin = `${(await headers()).get("x-forwarded-proto") ?? "http"}://${(await headers()).get("host")}`;
  const allLink = await db.shareLink.findFirst({ where: { profileId: profile.id, mode: "ALL" } });
  const hubUrl = allLink ? `${origin}/s/${allLink.token}?src=qr` : `${origin}/${profile.handle}`;
  const offline = { name: profile.name, sub: byline(profile.headline, profile.company), email: profile.email, phone: profile.phone, website: profile.website, company: profile.company, url: hubUrl, qr: await QRCode.toDataURL(hubUrl, { errorCorrectionLevel: "H", margin: 1, width: 520 }) };
  const vesc = (x: string) => x.replace(/\\/g, "\\\\").replace(/[;,]/g, (c) => "\\" + c).replace(/\r?\n/g, "\\n");
  const vcf = ["BEGIN:VCARD", "VERSION:3.0", `FN:${vesc(profile.name)}`, profile.company && `ORG:${vesc(profile.company)}`, profile.headline && `TITLE:${vesc(profile.headline)}`, profile.email && `EMAIL:${profile.email}`, profile.phone && `TEL;TYPE=CELL:${profile.phone}`, profile.website && `URL:${profile.website}`, `URL:${hubUrl}`, "END:VCARD"].filter(Boolean).join("\r\n") + "\r\n";
  const t = themeOf(profile.theme);
  const lines: CardLine[] = [];
  if (profile.phone) lines.push({ icon: "phone", text: profile.phone, href: `tel:${profile.phone.replace(/\s+/g, "")}` });
  if (profile.email) lines.push({ icon: "mail", text: profile.email, href: `mailto:${profile.email}` });
  if (profile.website) lines.push({ icon: "globe", text: profile.website.replace(/^https?:\/\//, ""), href: profile.website });
  const icons = SOCIALS.filter((s) => socials[s.key]).map((s) => (
    <a key={s.key} href={socials[s.key]} target="_blank" rel="noopener noreferrer" title={s.label} aria-label={s.label}
      style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.22)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><SocialIcon k={s.key} size={16} /></a>
  ));
  const avatar = <PhotoUpload action={uploadPhoto} size={56}><Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={56} /></PhotoUpload>;
  const logo = profile.logo ? `/logo/${profile.handle}?v=${encodeURIComponent(profile.logo)}` : undefined;
  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { dateStyle: "medium" }) : "No date yet");

  return (
    <>
      <SaveOfflineCard data={offline} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Hi, {profile.firstName || profile.name.split(" ")[0]} <span aria-hidden></span></h1>
          <div className="muted">{pct}% of your profile is complete{next ? ` · next: ${next.label.toLowerCase()}` : ""}</div>
        </div>
        <Link href="/app/settings" className="gear" aria-label="Card settings"></Link>
      </div>
      <div style={{ height: 8, borderRadius: 8, background: "#e8ebf2", overflow: "hidden", marginBottom: 14 }} role="progressbar" aria-label="Profile completion" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${pct}%`, height: "100%", background: gradient(profile.theme) }} />
      </div>
      {next && <Link href={next.href} className="menu-row"><span className="menu-ico"><Icon name="check" /></span><span style={{ flex: 1 }}><b>{next.label}</b><span className="muted" style={{ display: "block" }}>Finish your profile</span></span><span className="muted">›</span></Link>}

      <CardWithShare key={profile.theme}
        card={{ background: gradient(profile.theme), back: `linear-gradient(135deg, ${t.to}, ${t.from})`, avatar, name: profile.name, sub: byline(profile.headline, profile.company), logo, lines, social: icons }}
        share={{ name: profile.name, handle: profile.handle, url: hubUrl, qr: offline.qr, vcf, imageUrl: `/card/${profile.handle}/image?mode=ALL` }} />

      <div className="row" style={{ margin: "12px 0" }}>
        <a className="btn ghost" href="#profile">Edit profile</a>
      </div>

      <h2 style={{ fontSize: 15, margin: "16px 0 8px" }}>Your modes</h2>
      {visible.length === 0
        ? <div className="card muted">No mode is set up yet. <Link href="/app/card?pane=add">Add one</Link>.</div>
        : <ModeDropdown options={visible.map((m) => ({ value: m, label: `${MODE_INFO[m as Mode].icon} ${MODE_INFO[m as Mode].label}` }))} />}

      {dueCount + pendingCount > 0 && (
        <Link href="/app/contacts" className="menu-row" style={{ marginTop: 14, borderColor: "#f5c26b", background: "#fffaf0" }}>
          <span className="menu-ico" aria-hidden></span>
          <span style={{ flex: 1 }}><b>{dueCount ? `Follow up with ${dueCount} ${dueCount === 1 ? "person" : "people"} today` : `${pendingCount} connection ${pendingCount === 1 ? "request" : "requests"}`}</b><span className="muted" style={{ display: "block" }}>{dueCount && pendingCount ? `Plus ${pendingCount} connection request${pendingCount === 1 ? "" : "s"}` : "Open Connections"}</span></span>
          <span className="muted" aria-hidden>›</span>
        </Link>
      )}

      <h2 style={{ fontSize: 15, margin: "18px 0 8px" }}>Hire me</h2>
      <ToggleSwitch action={toggleHire} on={hireOn} label="Show Hire me on my card" hint="Experience, skills and resume for recruiters" />

      <h2 id="profile" style={{ fontSize: 15, margin: "18px 0 8px" }}>My profile</h2>
      {rows.map((r) => (
        <Link key={r.href} href={r.href} className="menu-row">
          <span className="menu-ico"><Icon name={r.icon} /></span>
          <span style={{ flex: 1, minWidth: 0 }}><b>{r.title}</b><span className="muted" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sub}</span></span>
          <span className="muted">›</span>
        </Link>
      ))}
      {visible.includes("RECRUITER") && <Link href="/app/hire" className="menu-row"><span className="menu-ico"><Icon name="search" /></span><span style={{ flex: 1 }}><b>Recruiting</b><span className="muted" style={{ display: "block" }}>{jobCount} open {jobCount === 1 ? "role" : "roles"}</span></span><span className="muted">›</span></Link>}

      <h2 style={{ fontSize: 15, margin: "18px 0 8px" }}>Upcoming events</h2>
      {upcoming.length === 0 && <div className="card muted">No events planned. <Link href="/app/events">Create one</Link>.</div>}
      {upcoming.map((e) => (
        <Link key={e.id} href={`/app/events/${e.id}`} className="menu-row">
          <span className="menu-ico">◈</span>
          <span style={{ flex: 1, minWidth: 0 }}><b>{e.name}</b><span className="muted" style={{ display: "block" }}>{fmt(e.startsAt)} · {e._count.attendees} registered</span></span>
          <span className="muted">›</span>
        </Link>
      ))}

      <form action={logout} style={{ marginTop: 16 }}><button className="ghost">Log out</button></form>
    </>
  );
}

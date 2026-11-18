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
import PhotoUpload from "@/components/photo-upload";
import { CardLine } from "@/components/digital-card";
import CardWithShare from "@/components/card-with-share";
import { SocialIcon } from "@/components/social-icon";
import { uploadPhoto } from "./profile/actions";
import Icon from "@/components/icon";
import PreviewLink from "@/components/preview-link";
import Logo from "@/components/logo";
import { unreadCount } from "@/lib/messages";
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

  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const unreadMsgs = await unreadCount(profile.id);
  const [dueCount, pendingCount] = await Promise.all([
    db.contact.count({ where: { profileId: profile.id, status: "CONNECTED", followUpAt: { lte: endOfToday } } }),
    db.contact.count({ where: { profileId: profile.id, status: "PENDING" } }),
  ]);
  const socials = parseSocials(profile.socials);
  const n = (k: string) => resources.filter((r) => r.kind === k).length;
  const socialCount = Object.values(socials).filter(Boolean).length;
  const steps = [
    { ok: !!profile.photo, label: "Add a photo", href: "/app/profile/details" },
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
    { href: "/app/profile/work", icon: "briefcase", title: "Experience & skills", sub: "Resume, experience, education, for job applications" },
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
      style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.22)", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><SocialIcon k={s.key} size={16} /></a>
  ));
  const avatar = <PhotoUpload action={uploadPhoto} size={56}><Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={56} /></PhotoUpload>;
  const logo = profile.logo ? `/logo/${profile.handle}?v=${encodeURIComponent(profile.logo)}` : undefined;
  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { dateStyle: "medium" }) : "No date yet");

  // The last 30 days, for the numbers on Home.
  const since = new Date(Date.now() - 30 * 86400_000);
  const myLinks = await db.shareLink.findMany({ where: { profileId: profile.id }, select: { id: true, mode: true } });
  const [scans, connections, openDeals, leads, applicants, invites, pending, due] = await Promise.all([
    db.scanEvent.findMany({ where: { shareLinkId: { in: myLinks.map((l) => l.id) }, createdAt: { gte: since } }, select: { mode: true } }),
    db.contact.count({ where: { profileId: profile.id, status: "CONNECTED" } }),
    db.deal.count({ where: { profileId: profile.id, stage: { in: ["NEW", "REVIEW", "TERM_SHEET"] } } }),
    db.contact.count({ where: { profileId: profile.id, mode: "SERVICES", tags: { contains: "lead" } } }),
    db.application.count({ where: { profileId: profile.id, status: { in: ["NEW", "SHORTLISTED", "INTERVIEW"] } } }),
    db.invite.count({ where: { candidateProfileId: profile.id } }),
    db.contact.findMany({ where: { profileId: profile.id, status: "PENDING" }, orderBy: { lastInteractionAt: "desc" }, take: 2 }),
    db.contact.findMany({ where: { profileId: profile.id, status: "CONNECTED", followUpAt: { lte: endOfToday } }, orderBy: { followUpAt: "asc" }, take: 2 }),
  ]);
  // People to meet: others on TapNodd with a photo who are not in your contacts yet.
  const known = new Set((await db.contact.findMany({ where: { profileId: profile.id }, select: { email: true } })).map((c) => c.email.toLowerCase()));
  const people = (await db.profile.findMany({ where: { id: { not: profile.id }, photo: { not: "" } }, include: { user: { select: { email: true } } }, orderBy: { id: "desc" }, take: 12 }))
    .filter((x) => !known.has((x.user?.email ?? "").toLowerCase())).slice(0, 6);
  const nextEvent = upcoming.find((e) => e.startsAt) ?? upcoming[0];
  const opens = (m: string) => scans.filter((x) => x.mode === m).length;
  const opportunities = openDeals + leads + applicants + invites;
  const ini = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  const modeCards = MODES.filter((m) => m !== "ALL" && m !== "OTHER" && cfgs.find((c) => c.mode === m)?.isEnabled);
  const missing = (["FOUNDER", "INVESTOR", "SERVICES", "RECRUITER"] as const).find((m) => !modeCards.includes(m));

  return (
    <>
      <SaveOfflineCard data={offline} />
      <header className="dz-top">
        <span className="dz-brand"><Logo size={26} />TapNodd</span>
        <span style={{ display: "flex", gap: 4 }}>
          <Link href="/app/messages" className="dz-ibtn" aria-label={unreadMsgs ? `Messages, ${unreadMsgs} unread` : "Messages"}>
            <Icon name="chat" size={22} />
            {unreadMsgs > 0 && <span className="dz-dot" aria-hidden />}
          </Link>
        <Link href="/app/contacts/inbox" className="dz-ibtn" aria-label={pendingCount ? `Inbox, ${pendingCount} waiting` : "Inbox"}>
          <Icon name="bell" size={22} />
          {pendingCount > 0 && <span className="dz-dot" aria-hidden />}
        </Link>
        </span>
      </header>

      <div className="dz-hello">
        {profile.photo
          ? <img src={`/photo/${profile.handle}?v=${encodeURIComponent(profile.photo)}`} alt="" width={56} height={56} />
          : <span className="avatar" style={{ width: 56, height: 56, fontSize: 18, border: 0 }} aria-hidden>{ini(profile.name)}</span>}
        <div>
          <h1>Hi {profile.firstName || profile.name.split(" ")[0]}</h1>
          <p>{modeCards.filter((m) => m !== "NORMAL").map((m) => MODE_INFO[m as Mode].label).join(" · ") || byline(profile.headline, profile.company)}</p>
        </div>
      </div>

      <form action="/app/contacts" className="dz-search" role="search">
        <label className="sr-only" htmlFor="home-q">Search</label>
        <Icon name="search" size={18} />
        <input id="home-q" name="q" placeholder="Search your connections" />
      </form>

      {next && (
        <Link href={next.href} className="dz-next">
          <span className="num">{pct}%</span>
          <span style={{ flex: 1, minWidth: 0 }}><b>{next.label}</b><span>Your profile is {pct}% complete</span></span>
          <span aria-hidden>›</span>
        </Link>
      )}

      <div className="dz-h"><h2>My modes</h2><Link href="/app/card?pane=add">Manage</Link></div>
      <div className="dz-modes">
        {modeCards.map((m, i) => (
          <Link key={m} href={`/app/card?mode=${m}`} className={`dz-mode m-${m}${i === 0 ? " on" : ""}`} title={visible.includes(m) ? `${opens(m)} ${opens(m) === 1 ? "open" : "opens"}` : "Add details"}>
            <Icon mode={m} size={22} />
            <span>{MODE_INFO[m as Mode].label}</span>
          </Link>
        ))}
        {missing && <Link href="/app/card?pane=add" className="dz-add" aria-label={`Add ${MODE_INFO[missing].label} mode`}><Icon name="plus" size={18} /></Link>}
      </div>

      <CardWithShare key={profile.theme}
        card={{ background: gradient(profile.theme), back: `linear-gradient(135deg, ${t.to}, ${t.from})`, avatar, name: profile.name, sub: byline(profile.headline, profile.company), logo, lines, social: icons }}
        share={{ name: profile.name, handle: profile.handle, url: hubUrl, qr: offline.qr, vcf, imageUrl: `/card/${profile.handle}/image?mode=ALL` }} />

      <div className="dz-tiles">
        <Link href="/app/nfc"><Icon name="nfc" size={22} /><span>Tap to share</span></Link>
        <Link href="/app/share"><Icon name="qr" size={22} /><span>QR code</span></Link>
        <PreviewLink href={`/${profile.handle}`} title="My public page"><Icon name="link" size={22} /><span>View my page</span></PreviewLink>
      </div>

      <div className="dz-stats" aria-label="Your network">
        <Link href="/app/contacts"><Icon name="users" size={20} /><b>{connections}</b><span>Connections</span></Link>
        <Link href="/app/contacts/inbox">{pendingCount > 0 && <i className="dz-badge">{pendingCount}</i>}<Icon name="user" size={20} /><b>{pendingCount}</b><span>Requests</span></Link>
        <Link href="/app/opportunities"><Icon name="spark" size={20} /><b>{opportunities}</b><span>Opportunities</span></Link>
      </div>

      {nextEvent && (
        <>
          <div className="dz-h"><h2>Upcoming event</h2><Link href="/app/events">All events</Link></div>
          <Link href={`/app/events/${nextEvent.id}`} className="dz-li">
            {nextEvent.cover ? <img src={`/event-img/${nextEvent.slug}/cover`} alt="" className="dz-thumb" /> : <span className="dz-thumb"><Icon name="calendar" size={22} /></span>}
            <span style={{ flex: 1, minWidth: 0 }}><b>{nextEvent.name}</b><span>{[fmt(nextEvent.startsAt), nextEvent.location].filter(Boolean).join(" · ")}</span></span>
            <span aria-hidden className="dz-chev">›</span>
          </Link>
        </>
      )}

      {(pending.length > 0 || due.length > 0) && (
        <>
          <div className="dz-h"><h2>Needs you</h2><Link href="/app/contacts/inbox">See all</Link></div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {pending.map((c) => (
              <Link key={c.id} href="/app/contacts/inbox" style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", color: "inherit", borderBottom: "1px solid var(--line)" }}>
                <span className="avatar" style={{ width: 36, height: 36, fontSize: 12, border: 0 }}>{ini(c.name)}</span>
                <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontWeight: 500 }}>{c.name}</b><span className="muted" style={{ display: "block", fontSize: 12.5 }}>{c.message || `Wants to connect from your ${MODE_INFO[c.mode as Mode]?.label ?? ""} page`}</span></span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--brand-hi)" }}>Review</span>
              </Link>
            ))}
            {due.map((c) => (
              <Link key={c.id} href={`/app/contacts/${c.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", color: "inherit", borderBottom: "1px solid var(--line)" }}>
                <span className="avatar" style={{ width: 36, height: 36, fontSize: 12, border: 0 }}>{ini(c.name)}</span>
                <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontWeight: 500 }}>Follow up with {c.name}</b><span className="muted" style={{ display: "block", fontSize: 12.5 }}>{c.company || c.email}</span></span>
                <span style={{ fontSize: 12, color: "var(--warn)" }}>Today</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {people.length > 0 && (
        <>
          <div className="dz-h"><h2>People you may know</h2><Link href="/app/contacts">Connections</Link></div>
          <div className="tn-people">
            {people.map((x) => (
              <div key={x.id} className="tn-person">
                <img src={`/photo/${x.handle}?v=${encodeURIComponent(x.photo)}`} alt="" width={56} height={56} />
                <b>{x.name}</b>
                <span>{byline(x.headline, x.company)}</span>
                <Link href={`/${x.handle}`} className="tn-connect">Connect</Link>
              </div>
            ))}
          </div>
        </>
      )}

    </>
  );
}

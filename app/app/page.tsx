import QRCode from "qrcode";
import Link from "next/link";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import { requireOwner } from "@/lib/auth";
import { modeHasContent } from "@/lib/mode-content";
import { buildNeedData, modeNeeds } from "@/lib/mode-needs";
import { bookingInfo } from "@/lib/booking";
import { SOCIALS, parseSocials } from "@/lib/socials";
import { THEMES, byline, gradient, themeOf } from "@/lib/look";
import Avatar from "@/components/avatar";
import ShareButtons from "@/components/share-buttons";
import NfcTap from "@/components/nfc-tap";
import Swiper from "@/components/swiper";
import PhotoUpload from "@/components/photo-upload";
import DigitalCard, { CardLine } from "@/components/digital-card";
import { SocialIcon } from "@/components/social-icon";
import { uploadPhoto } from "./profile/actions";
export const dynamic = "force-dynamic";

async function saveMode(fd: FormData) {
  "use server";
  const { profile } = await requireOwner();
  const mode = String(fd.get("mode"));
  await db.modeConfig.update({
    where: { profileId_mode: { profileId: profile.id, mode } },
    data: {
      ctaLabel: String(fd.get("cta")),
      intro: String(fd.get("intro") ?? "").trim().slice(0, 240),
      requireApproval: fd.get("approval") === "on",
      bookingUrl: String(fd.get("url")),
      isEnabled: mode === "ALL" ? true : fd.get("on") !== "off",
    },
  });
  revalidatePath("/app");
}

async function setTheme(fd: FormData) {
  "use server";
  const { profile } = await requireOwner();
  const theme = String(fd.get("theme"));
  if (!(theme in THEMES)) return;
  await db.profile.update({ where: { id: profile.id }, data: { theme } });
  revalidatePath("/app", "layout");
}

async function unsaveCard(fd: FormData) {
  "use server";
  const { user } = await requireOwner();
  await db.savedCard.deleteMany({ where: { id: String(fd.get("id")), userId: user.id } });
  revalidatePath("/app");
}

const label = (m: string) => `${MODE_INFO[m as Mode].icon} ${MODE_INFO[m as Mode].label}`;

export default async function Share({ searchParams }: { searchParams: Promise<{ mode?: string; pane?: string }> }) {
  const { user, profile } = await requireOwner();
  const sp = await searchParams;
  const [cfgs, links, contactCount, resources, teamCount, projectRows, eventCount, saved, jobCount, careerN] = await Promise.all([
    db.modeConfig.findMany({ where: { profileId: profile.id } }),
    db.shareLink.findMany({ where: { profileId: profile.id }, include: { _count: { select: { scans: true } } } }),
    db.contact.count({ where: { profileId: profile.id } }),
    db.resource.findMany({ where: { profileId: profile.id }, select: { kind: true, modes: true } }),
    db.teamMember.count({ where: { profileId: profile.id } }),
    db.project.findMany({ where: { profileId: profile.id, eventId: null }, select: { modes: true } }),
    db.event.count({ where: { profileId: profile.id } }),
    db.savedCard.findMany({ where: { userId: user.id }, include: { profile: true }, orderBy: { createdAt: "desc" } }),
    db.job.count({ where: { profileId: profile.id, open: true } }),
    db.careerItem.count({ where: { profileId: profile.id } }),
  ]);
  const projectCount = projectRows.length;
  const projectModes = projectRows.flatMap((r) => r.modes.split(",").filter(Boolean));
  const h = await headers();
  const host = h.get("host") ?? "";
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${host}`;

  // Only modes with something in them are shown. The rest are offered under "Add a mode".
  const hireBits = careerN + (profile.skills.trim() || profile.openTo ? 1 : 0);
  const extra = { projects: projectCount, events: eventCount, jobs: jobCount, career: hireBits, projectModes };
  const visible = MODES.filter((m) => cfgs.find((c) => c.mode === m)?.isEnabled && modeHasContent(m, cfgs.find((c) => c.mode === m), resources, extra));
  const toAdd = MODES.filter((m) => !visible.includes(m));

  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 6);
  const recent = await db.scanEvent.findMany({ where: { shareLinkId: { in: links.map((l) => l.id) }, createdAt: { gte: since } }, select: { shareLinkId: true, createdAt: true } });
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(since); d.setDate(d.getDate() + i); return d; });
  const total = links.reduce((n, l) => n + l._count.scans, 0);
  const taps = await db.scanEvent.count({ where: { shareLink: { profileId: profile.id }, source: "nfc" } });

  const modeData = visible.map((m) => ({ mode: m, link: links.find((l) => l.mode === m)!, cfg: cfgs.find((c) => c.mode === m)! }));
  const qrs = await Promise.all(modeData.map((x) => QRCode.toDataURL(`${origin}/s/${x.link.token}?src=qr`, { margin: 1, width: 420, color: { dark: "#111827", light: "#ffffff" } })));

  const t = themeOf(profile.theme);
  const socials = parseSocials(profile.socials);
  const cardLines: CardLine[] = [];
  if (profile.phone) cardLines.push({ icon: "📞", text: profile.phone, href: `tel:${profile.phone.replace(/\s+/g, "")}` });
  if (profile.email) cardLines.push({ icon: "✉️", text: profile.email, href: `mailto:${profile.email}` });
  if (profile.website) cardLines.push({ icon: "🌐", text: profile.website.replace(/^https?:\/\//, ""), href: profile.website });
  const socialIcons = SOCIALS.filter((s) => socials[s.key]).map((s) => (
    <a key={s.key} href={socials[s.key]} target="_blank" rel="noopener noreferrer" title={s.label} aria-label={s.label}
      style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.22)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><SocialIcon k={s.key} size={16} /></a>
  ));
  const avatarNode = <PhotoUpload action={uploadPhoto} size={56}><Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={56} /></PhotoUpload>;

  // Dropdown: the modes you have, then Add a mode, Tap and Wallet.
  const labels = [...visible.map(label), "＋ Add a mode", "📲 Tap (NFC)", "👛 Wallet"];
  const addIdx = visible.length, tapIdx = visible.length + 1, walletIdx = visible.length + 2;
  const start = sp.pane === "tap" ? tapIdx : sp.pane === "wallet" ? walletIdx : sp.pane === "add" ? addIdx
    : visible.includes(sp.mode as Mode) ? visible.indexOf(sp.mode as Mode) : toAdd.includes(sp.mode as Mode) ? addIdx : 0;

  return (
    <>
      <div className="shell-head" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <PhotoUpload action={uploadPhoto} size={46}><Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={46} /></PhotoUpload>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ fontSize: 17 }}>Hi, {profile.firstName || profile.name.split(" ")[0]} 👋</b>
          <div className="muted">{total} scans · {taps} taps · {contactCount} contacts</div>
        </div>
      </div>

      <Swiper labels={labels} initial={start} select>
        {modeData.map(({ mode, link, cfg }, i) => {
          const info = MODE_INFO[mode];
          const mine = recent.filter((r) => r.shareLinkId === link.id);
          const counts = days.map((d) => mine.filter((r) => r.createdAt.toDateString() === d.toDateString()).length);
          const max = Math.max(1, ...counts);
          const needs = modeNeeds(mode, buildNeedData({ profile, cfg, mode, resources, team: teamCount, projects: projectCount, events: eventCount, jobs: jobCount, career: careerN, skills: !!profile.skills.trim() }));
          const todo = needs.filter((n) => !n.ok);
          const book = bookingInfo(cfg.bookingUrl, host);
          return (
            <div key={mode}>
              <DigitalCard
                key={mode + profile.theme}
                background={gradient(profile.theme)} back={`linear-gradient(135deg, ${t.to}, ${t.from})`}
                avatar={avatarNode} name={profile.name} sub={byline(profile.headline, profile.company)}
                qr={qrs[i]} logo={profile.logo ? `/logo/${profile.handle}?v=${encodeURIComponent(profile.logo)}` : undefined} lines={cardLines} social={socialIcons}
              />
              <div className="row" style={{ marginTop: 8 }}>
                <a className="btn ghost" href={`/card/${profile.handle}/image?mode=${mode}`} download={`${profile.handle}-card.png`}>⬇ Card image</a>
                <a className="btn ghost" href={qrs[i]} download={`${profile.handle}-${mode.toLowerCase()}-qr.png`}>⬇ QR code</a>
              </div>
              <ShareButtons url={`${origin}/s/${link.token}`} title={`${profile.name} · ${info.label}`} />
              <div className="row" style={{ marginTop: 8 }}>
                <a className="btn ghost" href={`/${profile.handle}?mode=${mode}`} target="_blank">Preview page</a>
                <a className="btn ghost" href="/app?pane=wallet">👛 Add to wallet</a>
              </div>

              <div className="card" style={{ marginTop: 14, borderColor: todo.length ? "#ffd8a8" : "#b2f2bb", background: todo.length ? "#fff9f0" : "#f3fcf5" }}>
                <b>{info.icon} {todo.length ? `Finish your ${info.label} page` : `${info.label} page is ready ✓`}</b>
                <div className="muted" style={{ marginBottom: 6 }}>{info.blurb}</div>
                {needs.map((n) => (
                  <Link key={n.label} href={n.href} style={{ display: "flex", gap: 8, padding: "5px 0", color: n.ok ? "#6b7587" : "#1c2330" }}>
                    <span>{n.ok ? "✅" : "➕"}</span><span style={{ flex: 1, textDecoration: n.ok ? "line-through" : "none" }}>{n.label}</span>
                  </Link>
                ))}
              </div>

              <div className="card">
                <b>Last 7 days</b> <span className="muted">· {link._count.scans} scans</span>
                <div className="bars">{counts.map((c, n) => <div key={n} className={n === 6 ? "hi" : ""} style={{ height: `${(c / max) * 100}%` }} title={`${c} scans`} />)}</div>
                <div className="bars-l">{days.map((d, n) => <span key={n}>{"SMTWTFS"[d.getDay()]}</span>)}</div>
              </div>

              <form action={setTheme} className="card">
                <b>Card colour</b> <a href="/app/profile/company" style={{ float: "right" }}>🎨 Company logo &amp; colours →</a>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                  {Object.entries(THEMES).map(([k, th]) => (
                    <button key={k} name="theme" value={k} aria-label={th.name} title={th.name}
                      style={{ width: 38, height: 38, padding: 0, borderRadius: "50%", background: `linear-gradient(135deg, ${th.from}, ${th.to})`, border: profile.theme === k ? "3px solid #111827" : "3px solid #fff", boxShadow: "0 0 0 1px #cfd4dd" }} />
                  ))}
                </div>
              </form>

              <form action={saveMode} className="card">
                <input type="hidden" name="mode" value={mode} />
                <h3 style={{ marginTop: 0 }}>Settings for {info.label}</h3>
                <label style={{ display: "block", margin: "6px 0 2px" }}><input type="checkbox" name="approval" defaultChecked={cfg.requireApproval} /><b>🔒 Visitors need my approval</b></label>
                <p className="muted" style={{ margin: "0 0 8px" }}>People who scan see only your name and a request form until you approve them in Contacts.</p>
                <label className="f">Intro message</label>
                <textarea name="intro" rows={2} maxLength={240} defaultValue={cfg.intro} placeholder={`A short hello for ${info.label.toLowerCase()} visitors`} />
                <label className="f">Button label</label>
                <input name="cta" defaultValue={cfg.ctaLabel} />
                <label className="f">Booking link</label>
                <input name="url" defaultValue={cfg.bookingUrl} placeholder="Calendly, Cal.com, Google Calendar, Microsoft Bookings…" inputMode="url" autoCapitalize="none" />
                <p className="muted" style={{ margin: "0 0 8px" }}>{book ? `${book.icon} ${book.provider}${book.embed ? " · visitors book right on your page" : " · opens the booking page"}` : "Paste any scheduling link. Calendly, Cal.com and Google Calendar show inside your page."}</p>
                {mode !== "ALL" && <label style={{ display: "block", margin: "8px 0" }}><input type="checkbox" name="on" value="off" />Hide this mode for now</label>}
                <button>Save settings</button>
              </form>
            </div>
          );
        })}

        <div key="add">
          <h2 style={{ marginTop: 0 }}>Add a mode</h2>
          <p className="muted" style={{ marginTop: 0 }}>A mode shows up for visitors once you add something to it. Pick the ones that describe you.</p>
          {toAdd.filter((m) => m !== "ALL").length === 0 && <div className="card muted">You have added every mode.</div>}
          {toAdd.filter((m) => m !== "ALL").map((m) => (
            <Link key={m} href={m === "HIRE" ? "/app/profile/work" : `/app/profile/kit?mode=${m}`} className="menu-row">
              <span className="menu-ico">{MODE_INFO[m].icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}><b>{MODE_INFO[m].label}</b><span className="muted" style={{ display: "block" }}>{MODE_INFO[m].blurb}</span></span>
              <span className="muted">＋</span>
            </Link>
          ))}
        </div>

        <NfcTap key="tap" links={modeData.map((x) => ({ mode: x.mode, label: MODE_INFO[x.mode].label, url: `${origin}/t/${x.link.token}` }))} />

        <div key="wallet">
          <h2 style={{ marginTop: 0 }}>Wallet</h2>
          <div className="card">
            <b>Add my card to my phone</b>
            <div className="row" style={{ marginTop: 10 }}>
              <a className="btn" href="/wallet/google">Google Wallet</a>
              <a className="btn ghost" href="/wallet/apple">Apple Wallet</a>
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>Or save the card image from any mode and keep it in Photos, or tap Share → Add to Home Screen in your browser.</p>
          </div>

          <h3 style={{ margin: "14px 0 6px" }}>Saved cards ({saved.length})</h3>
          {saved.length === 0 && <div className="card muted">Cards you save from other people&apos;s pages appear here. Open a page and tap <b>Save card</b>. You can add as many as you like, any time.</div>}
          {saved.map((s) => (
            <div className="card" key={s.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={s.profile.name} handle={s.profile.handle} hasPhoto={!!s.profile.photo} avatar={s.profile.avatar} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}><b>{s.profile.name}</b><div className="muted">{byline(s.profile.headline, s.profile.company)}</div></div>
              <a className="btn ghost sm" href={`/${s.profile.handle}?mode=${s.mode}`} target="_blank" style={{ width: "auto", padding: "6px 12px" }}>Open</a>
              <form action={unsaveCard}><input type="hidden" name="id" value={s.id} /><button className="ghost sm">Remove</button></form>
            </div>
          ))}
        </div>
      </Swiper>
    </>
  );
}

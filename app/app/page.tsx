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
import TapShare from "@/components/tap-share";
import { peekTap, saveTapCard } from "./tap-actions";
import ModePanels from "@/components/mode-panels";
import QrPanel from "@/components/qr-panel";
import ScanOthers from "@/components/scan-others";
import PhotoUpload from "@/components/photo-upload";
import DigitalCard, { CardLine } from "@/components/digital-card";
import { SocialIcon } from "@/components/social-icon";
import { uploadPhoto } from "./profile/actions";
export const dynamic = "force-dynamic";

async function unsaveCard(fd: FormData) {
  "use server";
  const { user } = await requireOwner();
  await db.savedCard.deleteMany({ where: { id: String(fd.get("id")), userId: user.id } });
  revalidatePath("/app");
}

const label = (m: string) => `${MODE_INFO[m as Mode].icon} ${MODE_INFO[m as Mode].label}`;

export default async function Share({ searchParams }: { searchParams: Promise<{ mode?: string; pane?: string; via?: string }> }) {
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
  const qrs = await Promise.all(modeData.map((x) => QRCode.toDataURL(`${origin}/s/${x.link.token}?src=qr`, { errorCorrectionLevel: "H", margin: 1, width: 600, color: { dark: "#111827", light: "#ffffff" } })));

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

  // Three ways to share: show a QR, tap, or scan someone else's.
  const via = sp.via === "tap" || sp.pane === "tap" ? "tap" : sp.via === "scan" ? "scan" : "qr";
  const labels = [...visible.map(label), "＋ Add a mode", "👛 Wallet"];
  const addIdx = visible.length, walletIdx = visible.length + 1;
  const start = sp.pane === "wallet" ? walletIdx : sp.pane === "add" ? addIdx
    : visible.includes(sp.mode as Mode) ? visible.indexOf(sp.mode as Mode) : toAdd.includes(sp.mode as Mode) ? addIdx : 0;
  const logoUrl = profile.logo ? `/logo/${profile.handle}?v=${encodeURIComponent(profile.logo)}` : undefined;

  return (
    <>
      <div className="shell-head" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <PhotoUpload action={uploadPhoto} size={46}><Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={46} /></PhotoUpload>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ fontSize: 17 }}>Hi, {profile.firstName || profile.name.split(" ")[0]} 👋</b>
          <div className="muted">{total} scans · {taps} taps · {contactCount} contacts</div>
        </div>
        <Link href="/app/settings" className="gear" aria-label="Card settings" title="Card colour, logo and settings">⚙</Link>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 18px", minHeight: 0 }}>
        {/* the card is always here, the same for every mode */}
        <DigitalCard
          key={profile.theme}
          background={gradient(profile.theme)} back={`linear-gradient(135deg, ${t.to}, ${t.from})`}
          avatar={avatarNode} name={profile.name} sub={byline(profile.headline, profile.company)} logo={logoUrl} lines={cardLines} social={socialIcons}
        />
        <div className="row" style={{ marginTop: 8 }}>
          <a className="btn ghost" href={`/card/${profile.handle}/image?mode=ALL`} download={`${profile.handle}-card.png`}>⬇ Card image</a>
          <Link className="btn ghost" href="/app?pane=wallet">👛 Wallet</Link>
        </div>

        <div className="chips" style={{ margin: "14px 0 12px" }}>
          <Link href="/app" className={"pill" + (via === "qr" ? " on" : "")} style={{ padding: "7px 16px" }}>▦ QR code</Link>
          <Link href="/app?via=tap" className={"pill" + (via === "tap" ? " on" : "")} style={{ padding: "7px 16px" }}>📲 Tap</Link>
          <Link href="/app?via=scan" className={"pill" + (via === "scan" ? " on" : "")} style={{ padding: "7px 16px" }}>📷 Scan</Link>
        </div>

        {via === "tap" ? (
          <TapShare
            pages={modeData.map((x) => ({ mode: x.mode, label: MODE_INFO[x.mode].label, icon: MODE_INFO[x.mode].icon, tapUrl: `${origin}/t/${x.link.token}` }))}
            avatar={<Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={96} />}
            peek={peekTap} save={saveTapCard}
          />
        ) : via === "scan" ? (
          <ScanOthers peek={peekTap} save={saveTapCard} />
        ) : (
          <ModePanels title="Your QR opens this page" labels={labels} initial={start}>
            {modeData.map(({ mode, link }, i) => {
              const info = MODE_INFO[mode];
              const mine = recent.filter((r) => r.shareLinkId === link.id);
              const counts = days.map((d) => mine.filter((r) => r.createdAt.toDateString() === d.toDateString()).length);
              const max = Math.max(1, ...counts);
              const cfg = modeData[i].cfg;
              const needs = modeNeeds(mode, buildNeedData({ profile, cfg, mode, resources, team: teamCount, projects: projectCount, events: eventCount, jobs: jobCount, career: careerN, skills: !!profile.skills.trim() }));
              const todo = needs.filter((n) => !n.ok);
              return (
                <div key={mode}>
                  <QrPanel
                    qrSrc={qrs[i]} url={`${origin}/s/${link.token}`} name={profile.name} modeLabel={info.label} modeIcon={info.icon}
                    frame={gradient(profile.theme)} downloadName={`${profile.handle}-${mode.toLowerCase()}-qr.png`}
                    center={<Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={46} />}
                  />
                  <div className="row" style={{ marginTop: 8 }}>
                    <a className="btn ghost" href={`/${profile.handle}?mode=${mode}`} target="_blank">Preview page</a>
                    <Link className="btn ghost" href={`/app/settings?mode=${mode}`}>⚙ Page settings</Link>
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

            <div key="wallet">
              <h2 style={{ marginTop: 0 }}>Wallet</h2>
              <div className="card">
                <b>Add my card to my phone</b>
                <div className="row" style={{ marginTop: 10 }}>
                  <a className="btn" href="/wallet/google">Google Wallet</a>
                  <a className="btn ghost" href="/wallet/apple">Apple Wallet</a>
                </div>
                <p className="muted" style={{ marginBottom: 0 }}>Or save the card image and keep it in Photos, or tap Share → Add to Home Screen in your browser.</p>
              </div>

              <h3 style={{ margin: "14px 0 6px" }}>Saved cards ({saved.length})</h3>
              {saved.length === 0 && <div className="card muted">Cards you save from other people&apos;s pages, taps or QR codes appear here.</div>}
              {saved.map((sv) => (
                <div className="card" key={sv.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={sv.profile.name} handle={sv.profile.handle} hasPhoto={!!sv.profile.photo} avatar={sv.profile.avatar} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}><b>{sv.profile.name}</b><div className="muted">{byline(sv.profile.headline, sv.profile.company)}</div></div>
                  <a className="btn ghost sm" href={`/${sv.profile.handle}?mode=${sv.mode}`} target="_blank" style={{ width: "auto", padding: "6px 12px" }}>Open</a>
                  <form action={unsaveCard}><input type="hidden" name="id" value={sv.id} /><button className="ghost sm">Remove</button></form>
                </div>
              ))}
            </div>
          </ModePanels>
        )}
      </div>
    </>
  );
}

import QRCode from "qrcode";
import Link from "next/link";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { MODES, MODE_INFO, Mode, modePath } from "@/lib/modes";
import { requireOwner } from "@/lib/auth";
import { modeHasContent } from "@/lib/mode-content";
import { buildNeedData, modeNeeds } from "@/lib/mode-needs";
import { bookingInfo } from "@/lib/booking";
import { SOCIALS, parseSocials } from "@/lib/socials";
import { THEMES, byline, gradient, themeOf } from "@/lib/look";
import Avatar from "@/components/avatar";
import TapShare from "@/components/tap-share";
import { peekTap, saveTapCard } from "../tap-actions";
import ModeDeck from "@/components/mode-deck";
import QrPanel from "@/components/qr-panel";
import ScanOthers from "@/components/scan-others";
import PhotoUpload from "@/components/photo-upload";
import { addMode, removeMode } from "../modes/actions";
import ShareSheet from "@/components/share-sheet";
import DigitalCard, { CardLine } from "@/components/digital-card";
import { SocialIcon } from "@/components/social-icon";
import { uploadPhoto } from "../profile/actions";
import Icon from "@/components/icon";
import CopyButton from "@/components/copy-button";
import PreviewLink from "@/components/preview-link";
export const dynamic = "force-dynamic";
export const metadata = { title: "My card" };

async function unsaveCard(fd: FormData) {
  "use server";
  const { user } = await requireOwner();
  await db.savedCard.deleteMany({ where: { id: String(fd.get("id")), userId: user.id } });
  revalidatePath("/app/card");
}

const label = (m: string) => MODE_INFO[m as Mode].label;

export default async function MyCard({ searchParams }: { searchParams: Promise<{ mode?: string; pane?: string; via?: string }> }) {
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
  const vesc = (x: string) => x.replace(/\\/g, "\\\\").replace(/[;,]/g, (c) => "\\" + c).replace(/\r?\n/g, "\\n");
  const hub = links.find((l) => l.mode === "ALL");
  const hubUrl = hub ? `${origin}/s/${hub.token}` : `${origin}/${profile.handle}`;
  const hubQr = await QRCode.toDataURL(hub ? `${hubUrl}?src=qr` : hubUrl, { errorCorrectionLevel: "H", margin: 1, width: 700 });
  const vcf = ["BEGIN:VCARD", "VERSION:3.0", `FN:${vesc(profile.name)}`, profile.company && `ORG:${vesc(profile.company)}`, profile.headline && `TITLE:${vesc(profile.headline)}`, profile.email && `EMAIL:${profile.email}`, profile.phone && `TEL;TYPE=CELL:${profile.phone}`, profile.website && `URL:${profile.website}`, `URL:${hubUrl}`, "END:VCARD"].filter(Boolean).join("\r\n") + "\r\n";
  const cardLines: CardLine[] = [];
  if (profile.phone) cardLines.push({ icon: "phone", text: profile.phone, href: `tel:${profile.phone.replace(/\s+/g, "")}` });
  if (profile.email) cardLines.push({ icon: "mail", text: profile.email, href: `mailto:${profile.email}` });
  if (profile.website) cardLines.push({ icon: "globe", text: profile.website.replace(/^https?:\/\//, ""), href: profile.website });
  const socialIcons = SOCIALS.filter((s) => socials[s.key]).map((s) => (
    <a key={s.key} href={socials[s.key]} target="_blank" rel="noopener noreferrer" title={s.label} aria-label={s.label}
      style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.22)", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><SocialIcon k={s.key} size={16} /></a>
  ));
  const avatarNode = <PhotoUpload action={uploadPhoto} size={56}><Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={56} /></PhotoUpload>;

  // Three ways to share: show a QR, tap, or scan someone else's.
  const via = sp.via === "tap" || sp.pane === "tap" ? "tap" : sp.via === "scan" ? "scan" : "qr";
  const labels = [...visible.map(label), "Add a mode", "Wallet"];
  const addIdx = visible.length, walletIdx = visible.length + 1;
  const start = sp.pane === "wallet" ? walletIdx : sp.pane === "add" ? addIdx
    : visible.includes(sp.mode as Mode) ? visible.indexOf(sp.mode as Mode) : toAdd.includes(sp.mode as Mode) ? addIdx : 0;
  const logoUrl = profile.logo ? `/logo/${profile.handle}?v=${encodeURIComponent(profile.logo)}` : undefined;

  const deckItems = [
    ...visible.map((m) => ({
      label: MODE_INFO[m].label, sub: MODE_INFO[m].blurb,
      card: (
        <DigitalCard
          key={profile.theme + m}
          background={gradient(profile.theme)} back={`linear-gradient(135deg, ${t.to}, ${t.from})`}
          avatar={avatarNode} name={profile.name} sub={byline(profile.headline, profile.company)} logo={logoUrl} lines={cardLines} social={socialIcons}
        />
      ),
    })),
    { label: "Add a mode", sub: "Show another side of you", card: <div className="deck-add"><Icon name="plus" size={30} /><b>Add a mode</b></div> },
    { label: "Wallet", sub: "Your phone wallet and saved cards", card: <div className="deck-add"><Icon name="wallet" size={30} /><b>Wallet</b></div> },
  ];
  return (
    <>
      <div className="shell-head mc-head">
        <div className="mc-head-t">
          <h1>My card</h1>
          <p><span className="num">{total}</span> scans · <span className="num">{taps}</span> taps · <span className="num">{contactCount}</span> contacts</p>
        </div>
        <Link href="/app/nfc" className="d-ibtn d-ibtn-o" aria-label="NFC tags" title="NFC tags"><Icon name="nfc" size={19} /></Link>
        <Link href="/app/settings" className="d-ibtn d-ibtn-o" aria-label="Card settings" title="Card colour, logo and settings"><Icon name="settings" size={19} /></Link>
      </div>

      <div className="mc" style={{ flex: 1, overflowY: "auto", padding: "0 18px 18px", minHeight: 0 }}>
        <nav className="d-tabs mc-tabs" aria-label="Card, tap or scan">
          <Link href="/app/card" aria-current={via === "qr" ? "page" : undefined}><Icon name="qr" size={15} />My card</Link>
          <Link href="/app/card?via=tap" aria-current={via === "tap" ? "page" : undefined}><Icon name="nfc" size={15} />Tap</Link>
          <Link href="/app/card?via=scan" aria-current={via === "scan" ? "page" : undefined}><Icon name="scan" size={15} />Scan</Link>
        </nav>

        {via === "tap" ? (
          <div className="kit-share tapv"><div className="share-card">
          <TapShare
            pages={modeData.map((x) => ({ mode: x.mode, label: MODE_INFO[x.mode].label, icon: MODE_INFO[x.mode].icon, tapUrl: `${origin}/t/${x.link.token}` }))}
            avatar={<Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={96} />}
            peek={peekTap} save={saveTapCard}
          />
          </div></div>
        ) : via === "scan" ? (
          <>
            <ScanOthers peek={peekTap} save={saveTapCard} />
            <Link className="btn ghost mc-soft" style={{ marginTop: 12 }} href="/app/card?pane=wallet"><Icon name="wallet" size={18} />Saved cards</Link>
          </>
        ) : (
          <>
          <ModeDeck items={deckItems} initial={start}>
            {modeData.map(({ mode, link }, i) => {
              const info = MODE_INFO[mode];
              const mine = recent.filter((r) => r.shareLinkId === link.id);
              const counts = days.map((d) => mine.filter((r) => r.createdAt.toDateString() === d.toDateString()).length);
              const max = Math.max(1, ...counts);
              const cfg = modeData[i].cfg;
              const needs = modeNeeds(mode, buildNeedData({ profile, cfg, mode, resources, team: teamCount, projects: projectCount, events: eventCount, jobs: jobCount, career: careerN, skills: !!profile.skills.trim() }));
              const todo = needs.filter((n) => !n.ok);
              return (
                <div key={mode} className="kit-share cs">
                  <QrPanel
                    qrSrc={qrs[i]} url={`${origin}/s/${link.token}`} name={profile.name} modeLabel={info.label} modeIcon={info.icon}
                    frame={gradient(profile.theme)} downloadName={`${profile.handle}-${mode.toLowerCase()}-qr.png`}
                    center={<Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={46} />}
                  />
                  <div className="lk-url cs-link">
                    <code>{`${origin}${modePath(profile.handle, mode)}`.replace(/^https?:\/\//, "")}</code>
                    <CopyButton text={`${origin}${modePath(profile.handle, mode)}`} label="Copy link" />
                  </div>
                  <div className="cs-actions">
                    <PreviewLink className="btn ghost" href={modePath(profile.handle, mode)} title={`${info.label} page preview`}>Preview page</PreviewLink>
                    <Link className="btn ghost" href={mode === "NORMAL" ? "/app/profile/details" : mode === "ALL" ? `/app/settings?mode=${mode}` : `/app/profile/kit?mode=${mode}`}>Edit this page</Link>
                  </div>

                  <details className="cs-more">
                    <summary><span><b className={"cs-dot" + (todo.length ? " todo" : "")} />{todo.length ? `${todo.length} to finish` : "Ready to share"}</span><em>{link._count.scans} {link._count.scans === 1 ? "scan" : "scans"}</em></summary>
                  <div style={{ marginTop: 10, borderColor: todo.length ? "rgba(251,191,36,.35)" : "rgba(74,222,128,.35)", background: todo.length ? "rgba(251,191,36,.08)" : "rgba(74,222,128,.08)" }}>
                    <b>{todo.length ? `Finish your ${info.label} page` : `${info.label} page is ready`}</b>
                    <div className="muted" style={{ marginBottom: 6 }}>{info.blurb}</div>
                    {needs.map((n) => (
                      <Link key={n.label} href={n.href} style={{ display: "flex", gap: 8, padding: "5px 0", color: n.ok ? "var(--muted)" : "var(--ink)" }}>
                        <span style={{ display: "inline-flex", color: n.ok ? "#4ade80" : "var(--ink-4)" }} aria-hidden>{n.ok ? <Icon name="check" size={16} /> : <Icon name="plus" size={16} />}</span><span style={{ flex: 1, textDecoration: n.ok ? "line-through" : "none" }}>{n.label}</span>
                      </Link>
                    ))}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <b>Last 7 days</b> <span className="muted">· {link._count.scans} scans</span>
                    <div className="bars">{counts.map((c, n) => <div key={n} className={n === 6 ? "hi" : ""} style={{ height: `${(c / max) * 100}%` }} title={`${c} scans`} />)}</div>
                    <div className="bars-l">{days.map((d, n) => <span key={n}>{"SMTWTFS"[d.getDay()]}</span>)}</div>
                  </div>
                  </details>
                  {mode !== "ALL" && <form action={removeMode} className="cs-remove"><input type="hidden" name="mode" value={mode} /><button className="d-rm">Remove this mode</button></form>}
                </div>
              );
            })}

            <div key="add" className="mode-add cs-pane">
              <p className="mode-add-note" style={{ margin: "0 4px 12px" }}>Each mode is its own page for one kind of visitor. Pick only the ones that describe you.</p>
              {toAdd.filter((m) => m !== "ALL").length === 0 && <div className="kit-empty">You have added every mode.</div>}
              {toAdd.filter((m) => m !== "ALL").map((m) => (
                <form key={m} action={addMode} className="mode-opt">
                  <input type="hidden" name="mode" value={m} />
                  <i className="doc-ic" aria-hidden><Icon mode={m} size={22} /></i>
                  <span className="mode-opt-t"><b>{MODE_INFO[m].label}</b><span>{MODE_INFO[m].blurb}</span></span>
                  <button aria-label={`Add ${MODE_INFO[m].label} mode`}>Add</button>
                </form>
              ))}
            </div>

            <div key="wallet" className="cs-pane">
              <div className="cs-wallet">
                <b>Add my card to my phone</b>
                <div className="cs-actions" style={{ marginTop: 12 }}>
                  <a className="btn" href="/wallet/google">Google Wallet</a>
                  <a className="btn ghost" href="/wallet/apple">Apple Wallet</a>
                </div>
                <p className="mode-add-note" style={{ margin: "12px 0 0" }}>Or save the card image to Photos, or use Share, then Add to Home Screen in your browser.</p>
              </div>

              <h3 className="kit-sec">Saved cards<span>{saved.length}</span></h3>
              {saved.length === 0 && <div className="kit-empty">Cards you save from other people&apos;s pages, taps or QR codes appear here.</div>}
              {saved.map((sv) => (
                <div className="cs-saved" key={sv.id}>
                  <Avatar name={sv.profile.name} handle={sv.profile.handle} hasPhoto={!!sv.profile.photo} avatar={sv.profile.avatar} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}><b>{sv.profile.name}</b><div className="muted">{byline(sv.profile.headline, sv.profile.company)}</div></div>
                  <a className="btn ghost sm" href={`/${sv.profile.handle}?mode=${sv.mode}`} target="_blank" style={{ width: "auto", padding: "6px 12px" }}>Open</a>
                  <form action={unsaveCard}><input type="hidden" name="id" value={sv.id} /><button className="ghost sm">Remove</button></form>
                </div>
              ))}
            </div>
          </ModeDeck>
          </>
        )}
      </div>
    </>
  );
}

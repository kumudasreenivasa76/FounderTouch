import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MODE_INFO, Mode, kindLabel, kindsOf, parseFields, parseLinks, MAX_MODE_LINKS } from "@/lib/modes";
import { buildNeedData, modeNeeds } from "@/lib/mode-needs";
import { tagList } from "@/lib/tags";
import Swiper from "@/components/swiper";
import KitPanels from "@/components/kit-panels";
import { bookingInfo } from "@/lib/booking";
import { saveMode } from "../../settings/actions";
import { headers } from "next/headers";
import QRCode from "qrcode";
import LogoUpload from "@/components/logo-upload";
import { modeHasContent } from "@/lib/mode-content";
import { addMode } from "../../modes/actions";
import Icon from "@/components/icon";
import BrandForm from "@/components/brand-form";
import { THEMES, isCustomTheme, themeOf } from "@/lib/look";
import { saveBrand, setResourceLock, createQr, deleteQr } from "../actions";
import { setTheme } from "../../settings/actions";
import { gradient } from "@/lib/look";
import Avatar from "@/components/avatar";
import QrPanel from "@/components/qr-panel";
import TapShare from "@/components/tap-share";
import CopyButton from "@/components/copy-button";
import { peekTap, saveTapCard } from "../../tap-actions";
import { addTag, saveTag, resetTag, deleteTag } from "../../nfc/actions";
import { addResource, delResource, saveKitText, setResourceModes, setResourceExpiry } from "../actions";
export const dynamic = "force-dynamic";
const ic = (_m: Mode) => "";

const ERR: Record<string, string> = {
  url: "Links must start with http:// or https://",
  size: "That file is over 25 MB. Upload it to Google Drive and paste the link instead.",
  empty: "Paste a link or choose a file.",
  logo: "The logo must be a PNG, JPG or WebP under 2 MB.",
  locked: "Your team controls the brand colours and logo.",
};
const HINT: Record<string, string> = {
  DECK: "A Google Drive or Slides link, or a PDF, shows right on your page.",
  DEMO: "A YouTube, Vimeo, Loom or Drive link, or an MP4, plays on your page.",
  DOC: "A catalog, brochure or one-pager. Paste a link or upload a file.",
  SUPPORT: "Cap table, certificates, case studies. Tags let visitors filter them.",
};
const CTA_IDEAS = ["Let's connect", "Book a call", "Book a meeting", "Request a demo", "Get in touch", "Talk to us"];
const KIND_ICON: Record<string, string> = { DECK: "file", DEMO: "play", DOC: "file", SUPPORT: "folder" };
// Resume and Portfolio live under "Hire me", so they are not repeated here.
const KIT_KINDS = ["DECK", "DEMO", "DOC", "SUPPORT"] as const;
const PAGES = MODES.filter((m) => m !== "ALL" && m !== "HIRE");

export default async function Kits({ searchParams }: { searchParams: Promise<{ err?: string; saved?: string; kind?: string; mode?: string; tab?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const hd = await headers();
  const host = hd.get("host") ?? "";
  const origin = `${hd.get("x-forwarded-proto") ?? "http"}://${host}`;
  const [resources, cfgs, team, projects, events] = await Promise.all([
    db.resource.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "asc" } }),
    db.modeConfig.findMany({ where: { profileId: profile.id } }),
    db.teamMember.count({ where: { profileId: profile.id } }),
    db.project.count({ where: { profileId: profile.id, eventId: null } }),
    db.event.count({ where: { profileId: profile.id } }),
  ]);
  const [links, tags] = await Promise.all([
    db.shareLink.findMany({ where: { profileId: profile.id } }),
    db.nfcTag.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "asc" } }),
  ]);
  const qrOf = Object.fromEntries(await Promise.all(links.map(async (l) => [l.id, await QRCode.toDataURL(`${origin}/s/${l.token}?src=qr`, { errorCorrectionLevel: "H", margin: 1, width: 600, color: { dark: "#111827", light: "#ffffff" } })] as const)));
  // Only the modes this person has set up get a kit. The rest wait under "Add a mode".
  const [jobCount, projectRows] = await Promise.all([
    db.job.count({ where: { profileId: profile.id, open: true } }),
    db.project.findMany({ where: { profileId: profile.id }, select: { modes: true } }),
  ]);
  const extra = { projects, events, jobs: jobCount, projectModes: projectRows.flatMap((r) => r.modes.split(",").filter(Boolean)) };
  const hasContent = (m: Mode) => modeHasContent(m, cfgs.find((c) => c.mode === m), resources, extra);
  const isSetUp = (m: Mode) => !!cfgs.find((c) => c.mode === m)?.isEnabled && hasContent(m);
  // A mode opened by a direct link (for example from Settings) is shown even if it is not set up yet.
  const shown = PAGES.filter((m) => isSetUp(m) || m === sp.mode);
  const toAdd = PAGES.filter((m) => !shown.includes(m));
  const start = sp.mode === "ADD" ? shown.length : Math.max(0, shown.findIndex((m) => m === sp.mode));

  return (
    <>
      <div className="shell-head" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/app" className="muted">← Back</Link>
        <h1 style={{ fontSize: 17, margin: 0 }}>Kits</h1>
        <span className="muted" style={{ marginLeft: "auto" }}>Swipe to switch</span>
      </div>

      <Swiper labels={[...shown.map((m) => `${ic(m)}${MODE_INFO[m].label}`), "+ Add mode"]} initial={start}>
        {shown.map((m) => {
          const info = MODE_INFO[m];
          const cfg = cfgs.find((c) => c.mode === m);
          const values = parseFields(cfg?.fields ?? "{}");
          const text = cfg?.kitText || (m === "FOUNDER" ? profile.product : "");
          const needs = modeNeeds(m, buildNeedData({ profile, cfg: cfg ?? { kitText: "", fields: "{}", bookingUrl: "" }, mode: m, resources, team, projects, events }));
          const todo = needs.filter((n) => !n.ok);
          const mine = (k: string) => resources.filter((r) => r.kind === k && r.modes.split(",").includes(m));
          const kinds = KIT_KINDS.filter((k) => kindsOf(m).includes(k));
          const active = sp.mode === m;
          const kind = active && sp.kind && (kinds as readonly string[]).includes(sp.kind) ? sp.kind : kinds[0];
          return (
            <div key={m}>
              <header className="kit-head">
                <h1>{ic(m)}{info.kit}</h1>
                <p>{info.intro ?? `${info.blurb}. Fill in only what applies to you.`}</p>
              </header>
              {active && sp.saved && <div className="ok">Saved ✓</div>}
              {active && sp.err && <div className="err">{ERR[sp.err] ?? "Something went wrong."}</div>}

              <KitPanels mode={m} handle={profile.handle} initial={(sp.tab === "actions" || sp.tab === "share" || sp.tab === "brand") && active ? sp.tab : active && sp.kind ? "docs" : "details"}
                details={<>
              <div className={"kit-need" + (todo.length ? "" : " done")}>
                <div className="kit-need-top">
                  <b>{todo.length ? `Still needed for the ${info.label} page` : `${info.label} page is ready`}</b>
                  <span>{needs.length - todo.length}/{needs.length}</span>
                </div>
                <div className="kit-bar"><i style={{ width: `${needs.length ? ((needs.length - todo.length) / needs.length) * 100 : 100}%` }} /></div>
                {needs.map((n) => (
                  <Link key={n.label} href={n.href} className={"kit-step" + (n.ok ? " ok" : "")}>
                    <span className="dot" aria-hidden>{n.ok ? "✓" : "+"}</span><span className="t">{n.label}</span>
                  </Link>
                ))}
              </div>

              {m === "FOUNDER" && <LogoUpload action={saveBrand} ret={"kit:" + m} company={profile.company} logoSrc={profile.logo ? `/logo/${profile.handle}?v=${encodeURIComponent(profile.logo)}` : ""} />}
                <form action={saveKitText} className="card kit-form kit-lux">
                <input type="hidden" name="kmode" value={m} />
                <div className="kit-lux-top">
                  <i className="kit-lux-ic" aria-hidden><Icon mode={m} size={24} /></i>
                  <div>
                    <b>{info.label} details</b>
                    <span>What people see on your {info.label} page</span>
                  </div>
                </div>
                <label className="f">{info.about}</label>
                <textarea name="kitText" rows={3} defaultValue={text} placeholder={info.aboutHint} />
                {info.fields.map((f) => (
                  <div key={f.key}>
                    <label className="f">{f.label}</label>
                    {(f.type === "textarea" || f.type === "list") && <textarea name={"f_" + f.key} rows={f.type === "list" ? 2 : 3} defaultValue={values[f.key] ?? ""} placeholder={f.type === "list" ? `${f.hint ?? ""} (one per line or comma separated)`.trim() : f.hint} />}
                    {f.type === "text" && <input name={"f_" + f.key} defaultValue={values[f.key] ?? ""} placeholder={f.hint} />}
                    {f.type === "url" && <input name={"f_" + f.key} defaultValue={values[f.key] ?? ""} placeholder={f.hint ?? "https://"} inputMode="url" autoCapitalize="none" />}
                    {f.type === "select" && (
                      <select name={"f_" + f.key} defaultValue={values[f.key] ?? ""}>
                        <option value="">Not set</option>
                        {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                  </div>
                ))}
                <button>Save</button>
              </form>

                </>}
                docs={<>

              {m === "RECRUITER" && (
                <div className="card"><b>Open roles</b>
                  <p className="muted" style={{ margin: "4px 0 8px" }}>Post the roles you are hiring for. Candidates apply on your page and show up in Contacts.</p>
                  <Link className="btn" href="/app/hire">Manage open roles</Link>
                </div>
              )}

              <form action={addResource} className="card kit-form kit-add kit-lux" key={m + kind}>
                <input type="hidden" name="kmode" value={m} />
                <div className="kit-lux-top">
                  <i className="kit-lux-ic" aria-hidden><Icon name="share" size={24} /></i>
                  <div>
                    <b>Upload and add</b>
                    <span>A link or file for your {info.label} page</span>
                  </div>
                </div>
                <label className="f">Type</label>
                <select name="kind" defaultValue={kind}>{kinds.map((k) => <option key={k} value={k}>{kindLabel(m, k)}</option>)}</select>
                {kinds.map((k) => <p key={k} className="kit-hint" data-kind={k}>{HINT[k]}</p>)}
                <label className="f">Link</label>
                <input name="url" placeholder="https://" inputMode="url" autoCapitalize="none" />
                <div className="kit-or"><span>or</span></div>
                <label className="f">File, up to 25 MB</label>
                <input name="file" type="file" accept=".ppt,.pptx,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.mp4,.mov,.webm,.key" />
                <div className="kit-tags-f">
                  <label className="f" htmlFor={"tags-" + m}>Tags</label>
                  <input id={"tags-" + m} name="tags" maxLength={80} placeholder="e.g. legal, financials, case study" list={"tag-ideas-" + m} autoComplete="off" autoCapitalize="none" />
                  <datalist id={"tag-ideas-" + m}>{[...new Set(resources.flatMap((r) => tagList(r.tags)))].sort().map((t) => <option key={t} value={t} />)}</datalist>
                  <p className="kit-note">Separate tags with commas. Visitors can filter your documents by tag.</p>
                </div>
                <input type="hidden" name="modes" value={m} />
                <label className="kit-toggle"><input type="checkbox" name="gated" /><span><b>Lock this</b><span className="muted" style={{ display: "block" }}>Visitors ask for your approval before opening it.</span></span></label>
                <button>Add</button>
              </form>

              {kinds.map((k) => (
                <div key={k}>
                  <h3 className="kit-sec">{kindLabel(m, k)}<span>{mine(k).length}</span></h3>
                  {mine(k).length === 0 && <div className="kit-empty">Nothing here yet</div>}
                  {mine(k).map((r) => {
                    const also = r.modes.split(",").filter((x) => x && x !== m).map((x) => MODE_INFO[x as Mode]?.label).filter(Boolean).join(", ");
                    const until = r.expiresAt ? r.expiresAt.toISOString().slice(0, 10) : "";
                    return (
                    <div className="doc" key={r.id}>
                      <div className="doc-top">
                        <i className="doc-ic" aria-hidden><Icon name={KIND_ICON[k] ?? "file"} size={22} /></i>
                        <div className="doc-main">
                          <b>{r.title}</b>
                          <span className="doc-src">{r.filePath ? "Uploaded file" : new URL(r.url).hostname}</span>
                          {tagList(r.tags).length > 0 && <div className="doc-tags">{tagList(r.tags).map((t) => <span key={t}>#{t}</span>)}</div>}
                        </div>
                        <form action={delResource}><input type="hidden" name="id" value={r.id} /><button className="doc-del" aria-label={`Remove ${r.title}`}>Remove</button></form>
                      </div>
                      <form action={setResourceLock} className={"doc-lock" + (r.gated ? " on" : "")}>
                        <input type="hidden" name="id" value={r.id} /><input type="hidden" name="kmode" value={m} />
                        <input type="hidden" name="gated" value={r.gated ? "" : "on"} />
                        <i aria-hidden><Icon name="lock" size={18} /></i>
                        <span><b id={"lock-" + r.id}>{r.gated ? "Locked" : "Open to everyone"}</b><small>{r.gated ? "Visitors ask for approval first." : "Anyone with your link can open it."}</small></span>
                        <button type="submit" role="switch" aria-checked={r.gated} aria-labelledby={"lock-" + r.id} className="doc-sw"><span /></button>
                      </form>
                      <details className="doc-more">
                        <summary><span>More options</span><em>{[until && `Until ${until}`, also && `Also on ${also}`].filter(Boolean).join(" · ")}</em></summary>
                        <form action={setResourceExpiry} className="doc-opt">
                          <input type="hidden" name="id" value={r.id} /><input type="hidden" name="kmode" value={m} />
                          <label className="doc-opt-t" htmlFor={"exp-" + r.id}>Available until</label>
                          <div className="doc-line">
                            <input id={"exp-" + r.id} type="date" name="expiresAt" defaultValue={until} />
                            <button>Set</button>
                          </div>
                        </form>
                        <form action={setResourceModes} className="doc-opt">
                          <input type="hidden" name="id" value={r.id} /><input type="hidden" name="kmode" value={m} />
                          <span className="doc-opt-t">Show on these pages</span>
                          <div className="doc-chips">
                            {PAGES.filter((x) => kindsOf(x).includes(r.kind as never)).map((x) => (
                              <label key={x}><input type="checkbox" name="modes" value={x} defaultChecked={r.modes.split(",").includes(x)} />{MODE_INFO[x].label}</label>
                            ))}
                          </div>
                          <button>Save pages</button>
                        </form>
                      </details>
                    </div>
                    );
                  })}
                </div>
              ))}

                </>}
                share={(() => {
                  const mlinks = links.filter((l) => l.mode === m).sort((a, b) => a.id.localeCompare(b.id));
                  const link = mlinks[0];
                  const shared = resources.filter((r) => r.modes.split(",").includes(m));
                  const lockedN = shared.filter((r) => r.gated).length;
                  const mt = tags.filter((t) => t.mode === m);
                  const av = (n: number) => <Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={n} />;
                  return (<div className="kit-share">
                    <div className="kit-lux-top share-top">
                      <i className="kit-lux-ic" aria-hidden><Icon name="qr" size={24} /></i>
                      <div>
                        <b>Share your {info.label} page</b>
                        <span>What a scan or a tap opens</span>
                      </div>
                    </div>
                    <div className="share-stats">
                      <div><b>{text ? "Added" : "Missing"}</b><span>About you</span></div>
                      <div><b>{shared.length}</b><span>{shared.length === 1 ? "Document or link" : "Documents and links"}</span></div>
                      <div><b>{lockedN}</b><span>Locked, need your approval</span></div>
                    </div>
                    {mlinks.length === 0 && <div className="kit-empty">Add something to this page first, then your QR appears here.</div>}
                    {mlinks.map((l, i) => (
                      <div key={l.id} className="qr-item">
                        <h3 className="kit-sec">{mlinks.length > 1 ? `QR ${i + 1}` : "Your QR"}</h3>
                        <QrPanel qrSrc={qrOf[l.id]} url={`${origin}/s/${l.token}`} name={profile.name} modeLabel={info.label} modeIcon={info.icon}
                          frame={gradient(profile.theme)} downloadName={`${profile.handle}-${m.toLowerCase()}-qr${i ? i + 1 : ""}.png`} center={av(46)} moreTab={{ mode: m, tab: "brand" }} />
                        {i > 0 && <form action={deleteQr} style={{ marginTop: 8 }}><input type="hidden" name="kmode" value={m} /><input type="hidden" name="id" value={l.id} /><button className="ghost qr-del">Remove this QR</button></form>}
                      </div>
                    ))}
                    {link && <>
                      <form action={createQr} className="qr-new">
                        <input type="hidden" name="kmode" value={m} />
                        <div><b>Need another QR?</b><span className="muted">One per event or printed card, each with its own scan count.</span></div>
                        <button>Create new QR</button>
                      </form>
                      <h3 className="kit-sec">Tap to share</h3>
                      <div className="share-card">
                        <TapShare pages={[{ mode: m, label: info.label, icon: info.icon, tapUrl: `${origin}/t/${link.token}` }]} avatar={av(96)} peek={peekTap} save={saveTapCard} />
                      </div>
                    </>}
                    <h3 className="kit-sec">NFC tags<span>{mt.length}</span></h3>
                    {mt.map((t) => (
                      <form key={t.id} action={saveTag} className="nfc-tag">
                        <input type="hidden" name="id" value={t.id} /><input type="hidden" name="ret" value={m} /><input type="hidden" name="mode" value={m} /><input type="hidden" name="fallback" value={t.fallback} />
                        <div className="nfc-top">
                          <span className="nfc-ico" aria-hidden><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 8.5a6 6 0 0 1 0 7M10 6a10 10 0 0 1 0 12M14 3.5a14 14 0 0 1 0 17" /></svg></span>
                          <div className="nfc-name"><b>{t.nickname}</b><span className="muted">{t.taps} {t.taps === 1 ? "tap" : "taps"}{t.lastTapAt ? ` · last ${t.lastTapAt.toLocaleDateString()}` : ""}</span></div>
                          <span className={"nfc-state" + (t.enabled ? " on" : "")}>{t.enabled ? "Active" : "Off"}</span>
                        </div>
                        <input name="nickname" defaultValue={t.nickname} maxLength={40} aria-label="Nickname" placeholder="Nickname" />
                        <label className="kit-toggle"><input type="checkbox" name="enabled" defaultChecked={t.enabled} /><span>Active<span className="muted" style={{ display: "block" }}>Untick if you lose the tag</span></span></label>
                        <div className="nfc-link"><code>{origin}/n/{t.token}</code><CopyButton text={`${origin}/n/${t.token}`} /></div>
                        <div className="nfc-actions">
                          <button className="nfc-save">Save</button>
                          <a className="nfc-test" href={`/n/${t.token}`} target="_blank" rel="noreferrer">Test tap</a>
                          <button formAction={resetTag} className="ghost">Reset link</button>
                          <button formAction={deleteTag} className="ghost nfc-del">Delete</button>
                        </div>
                      </form>
                    ))}
                    <form action={addTag} className="nfc-add">
                      <input type="hidden" name="ret" value={m} />
                      <div className="nfc-add-top">
                        <span className="nfc-ico" aria-hidden><Icon name="nfc" size={22} /></span>
                        <div><b>Add an NFC tag</b><span>{mt.length === 0 ? "No tag opens this page yet. Name one to get its link." : "Name another tag to get its link."}</span></div>
                      </div>
                      <div className="nfc-add-row">
                        <input name="nickname" placeholder="Keychain, desk card" maxLength={40} aria-label="New tag nickname" />
                        <button>Add tag</button>
                      </div>
                    </form>
                  </div>);
                })()}
                brand={<>
                  <div className="card kit-form">
                    <h3>Card colour</h3>
                    <p className="muted" style={{ margin: "0 0 12px" }}>Pick a preset for your card and pages.</p>
                    <form action={setTheme} className="kit-swatches">
                      <input type="hidden" name="ret" value={"kit:" + m} />
                      {Object.entries(THEMES).map(([k, th]) => (
                        <button key={k} name="theme" value={k} aria-label={th.name} title={th.name} aria-pressed={profile.theme === k}
                          style={{ background: `linear-gradient(135deg, ${th.from}, ${th.to})` }} />
                      ))}
                    </form>
                    {isCustomTheme(profile.theme) && <p className="muted" style={{ margin: "12px 0 0" }}>You are using your own company colours. Pick a preset to switch back.</p>}
                  </div>
                  <BrandForm action={saveBrand} ret={"kit:" + m} company={profile.company} logoSrc={profile.logo ? `/logo/${profile.handle}?v=${encodeURIComponent(profile.logo)}` : ""} color1={themeOf(profile.theme).from} color2={themeOf(profile.theme).to} />
                </>}
                actions={<form action={saveMode} className="card kit-form kit-lux">
                  <input type="hidden" name="mode" value={m} />
                  <input type="hidden" name="ret" value="kit" />
                  <input type="hidden" name="hasLinks" value="1" />
                  <div className="kit-lux-top">
                    <i className="kit-lux-ic" aria-hidden><Icon name="chat" size={24} /></i>
                    <div>
                      <b>Connect</b>
                      <span>How visitors reach you on your {info.label} page</span>
                    </div>
                  </div>

                  <label className="f" htmlFor={"intro-" + m}>Intro message</label>
                  <textarea id={"intro-" + m} name="intro" rows={2} maxLength={240} defaultValue={cfg?.intro ?? ""} placeholder={`A short hello for ${info.label.toLowerCase()} visitors`} />
                  <p className="kit-note">Shown at the top of your page. Up to 240 characters.</p>

                  <div className="kit-group">
                    <b className="kit-group-t">Main button</b>
                    <label className="f" htmlFor={"cta-" + m}>Label</label>
                    <input id={"cta-" + m} name="cta" maxLength={60} defaultValue={cfg?.ctaLabel ?? info.cta} list={"cta-ideas-" + m} />
                    <datalist id={"cta-ideas-" + m}>{CTA_IDEAS.map((x) => <option key={x} value={x} />)}</datalist>
                    <label className="f" htmlFor={"book-" + m}>Booking link</label>
                    <input id={"book-" + m} name="url" defaultValue={cfg?.bookingUrl ?? ""} placeholder="Calendly, Cal.com or Google Calendar link" inputMode="url" autoCapitalize="none" />
                    {cfg?.bookingUrl
                      ? (() => { const bk = bookingInfo(cfg.bookingUrl, host); return bk ? <p className="kit-note ok">{bk.provider}{bk.embed ? ": visitors book right on your page." : ": opens the booking page in a new tab."}</p> : <p className="kit-note">Opens this link in a new tab.</p>; })()
                      : <p className="kit-note">Without a booking link, the button emails you instead.</p>}
                  </div>

                  <div className="kit-group">
                    <b className="kit-group-t">More links<span>{parseLinks(cfg?.links).length}/{MAX_MODE_LINKS}</span></b>
                    <p className="kit-note" style={{ marginTop: 0 }}>Extra buttons under the main one: website, WhatsApp, waitlist, an email address or phone number.</p>
                    {(() => {
                      const saved = parseLinks(cfg?.links);
                      const rows = saved.length < MAX_MODE_LINKS ? [...saved, { label: "", url: "" }] : saved;
                      return rows.map((l, i) => (
                        <div className="kit-link" key={i}>
                          <span className="kit-link-n" aria-hidden>{l.url ? i + 1 : <Icon name="plus" size={16} />}</span>
                          <div>
                            <input name="linkLabel" maxLength={40} defaultValue={l.label} placeholder={l.url ? "Button label" : "New button label, e.g. Join the waitlist"} aria-label={`Link ${i + 1} label`} />
                            <input name="linkUrl" maxLength={500} defaultValue={l.url} placeholder="https://, an email or a phone number" inputMode="url" autoCapitalize="none" aria-label={`Link ${i + 1} address`} />
                          </div>
                        </div>
                      ));
                    })()}
                    <p className="kit-note">Save to add another. Clear a link's address and save to remove it.</p>
                  </div>

                  <div className="kit-group">
                    <b className="kit-group-t">Privacy</b>
                    <label className="kit-toggle"><input type="checkbox" name="approval" defaultChecked={!!cfg?.requireApproval} /><span><b>Visitors need my approval</b><span className="muted" style={{ display: "block" }}>People who scan see only your name and a request form until you approve them in Contacts.</span></span></label>
                    <label className="kit-toggle"><input type="checkbox" name="on" value="off" defaultChecked={cfg?.isEnabled === false} /><span><b>Remove this mode</b><span className="muted" style={{ display: "block" }}>Your {info.label} page stops opening and moves to Add mode. Everything in it is kept.</span></span></label>
                  </div>
                  <button>Save</button>
                </form>} />
            </div>
          );
        })}
        <div key="add-mode" className="mode-add">
          <div className="kit-lux-top share-top">
            <i className="kit-lux-ic" aria-hidden><Icon name="plus" size={24} /></i>
            <div>
              <b>Add a mode</b>
              <span>Pick only the ones you need</span>
            </div>
          </div>
          {shown.length === 0 && <p className="mode-add-note">You have no modes yet. Add the first one to start building its page.</p>}
          {toAdd.length === 0 && <div className="kit-empty">You have added every mode.</div>}
          {toAdd.map((m) => {
            const kept = hasContent(m);
            return (
              <form key={m} action={addMode} className="mode-opt">
                <input type="hidden" name="mode" value={m} />
                <i className="doc-ic" aria-hidden><Icon mode={m} size={22} /></i>
                <span className="mode-opt-t"><b>{MODE_INFO[m].label}</b><span>{kept ? "Hidden. Everything in it is kept." : MODE_INFO[m].blurb}</span></span>
                <button aria-label={`${kept ? "Show" : "Add"} ${MODE_INFO[m].label} mode`}>{kept ? "Show again" : "Add"}</button>
              </form>
            );
          })}
          {shown.length > 0 && <p className="mode-add-note">To take a mode away, open it, go to Actions &amp; privacy and choose "Remove this mode". Nothing in it is deleted.</p>}
        </div>
      </Swiper>
    </>
  );
}

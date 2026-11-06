import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MODE_INFO, Mode, kindLabel, kindsOf, parseFields } from "@/lib/modes";
import { buildNeedData, modeNeeds } from "@/lib/mode-needs";
import { tagList } from "@/lib/tags";
import Swiper from "@/components/swiper";
import KitPanels from "@/components/kit-panels";
import { bookingInfo } from "@/lib/booking";
import { saveMode } from "../../settings/actions";
import { headers } from "next/headers";
import QRCode from "qrcode";
import LogoUpload from "@/components/logo-upload";
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
  const start = Math.max(0, PAGES.findIndex((m) => m === sp.mode));

  return (
    <>
      <div className="shell-head" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/app" className="muted">← Back</Link>
        <h1 style={{ fontSize: 17, margin: 0 }}>Kits</h1>
        <span className="muted" style={{ marginLeft: "auto" }}>Swipe to switch</span>
      </div>

      <Swiper labels={PAGES.map((m) => `${ic(m)}${MODE_INFO[m].label}`)} initial={start}>
        {PAGES.map((m) => {
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
                <form action={saveKitText} className="card kit-form">
                <input type="hidden" name="kmode" value={m} />
                <h3>{info.about}</h3>
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

              {kinds.map((k) => (
                <div key={k}>
                  <h3 className="kit-sec">{kindLabel(m, k)}<span>{mine(k).length}</span></h3>
                  {mine(k).length === 0 && <div className="kit-empty">Nothing here yet</div>}
                  {mine(k).map((r) => (
                    <div className="card" key={r.id}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <b>{r.title}</b>{r.gated && <span className="lock-badge">Locked</span>}
                          {tagList(r.tags).length > 0 && <div>{tagList(r.tags).map((t) => <span key={t} className="pill">#{t}</span>)}</div>}
                          <div className="muted">{r.filePath ? "Uploaded file" : new URL(r.url).hostname}</div>
                        </div>
                        <form action={delResource}><input type="hidden" name="id" value={r.id} /><button className="ghost sm">Remove</button></form>
                      </div>
                      <form action={setResourceLock} className="lock-row">
                        <input type="hidden" name="id" value={r.id} /><input type="hidden" name="kmode" value={m} />
                        <label className="switch-row"><input type="checkbox" name="gated" defaultChecked={r.gated} /><span><b>{r.gated ? "Locked" : "Open to everyone"}</b><span className="muted" style={{ display: "block" }}>{r.gated ? "Visitors ask for approval first." : "Anyone with your link can open it."}</span></span></label>
                        <button className="ghost sm" style={{ width: "auto" }}>Update</button>
                      </form>
                      <form action={setResourceExpiry} className="row" style={{ marginTop: 8, alignItems: "center" }}>
                        <input type="hidden" name="id" value={r.id} /><input type="hidden" name="kmode" value={m} />
                        <span className="muted">Available until</span>
                        <input type="date" name="expiresAt" defaultValue={r.expiresAt ? r.expiresAt.toISOString().slice(0, 10) : ""} />
                        <button className="ghost sm" style={{ width: "auto" }}>Set</button>
                      </form>
                      <details style={{ marginTop: 8 }}>
                        <summary className="muted">Also on: {r.modes.split(",").filter((x) => x && x !== m).map((x) => MODE_INFO[x as Mode]?.label).filter(Boolean).join(", ") || "only this page"} · <span style={{ color: "#3b5bdb" }}>change</span></summary>
                        <form action={setResourceModes}>
                          <input type="hidden" name="id" value={r.id} /><input type="hidden" name="kmode" value={m} />
                          <div className="chips">
                            {PAGES.filter((x) => kindsOf(x).includes(r.kind as never)).map((x) => (
                              <label key={x} className="pill" style={{ cursor: "pointer" }}><input type="checkbox" name="modes" value={x} defaultChecked={r.modes.split(",").includes(x)} />{MODE_INFO[x].label}</label>
                            ))}
                          </div>
                          <button className="ghost sm">Save</button>
                        </form>
                      </details>
                    </div>
                  ))}
                </div>
              ))}

              <form action={addResource} className="card kit-form kit-add" key={m + kind}>
                <input type="hidden" name="kmode" value={m} />
                <h3>Add to {info.kit}</h3>
                <select name="kind" defaultValue={kind}>{kinds.map((k) => <option key={k} value={k}>{kindLabel(m, k)}</option>)}</select>
                <p className="kit-hint">{HINT[kind]}</p>
                <input name="url" placeholder="Paste a link" inputMode="url" autoCapitalize="none" />
                <div className="kit-or"><span>or</span></div>
                <label className="f">Upload a file · up to 25 MB</label>
                <input name="file" type="file" accept=".ppt,.pptx,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.mp4,.mov,.webm,.key" />
                <input type="hidden" name="modes" value={m} />
                <label className="kit-toggle"><input type="checkbox" name="gated" /><span><b>Lock this</b><span className="muted" style={{ display: "block" }}>Visitors must ask for your approval before they can open it.</span></span></label>
                <button>Add</button>
              </form>

                </>}
                share={(() => {
                  const mlinks = links.filter((l) => l.mode === m).sort((a, b) => a.id.localeCompare(b.id));
                  const link = mlinks[0];
                  const shared = resources.filter((r) => r.modes.split(",").includes(m));
                  const lockedN = shared.filter((r) => r.gated).length;
                  const mt = tags.filter((t) => t.mode === m);
                  const av = (n: number) => <Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={n} />;
                  return (<div className="kit-share">
                    <div className="share-info">
                      <b>What people see when they scan</b>
                      <ul>
                        <li><span>About you</span><em>{text ? "Added" : "Not added yet"}</em></li>
                        <li><span>Documents and links</span><em>{shared.length === 0 ? "None yet" : `${shared.length} item${shared.length === 1 ? "" : "s"}`}</em></li>
                        <li><span>Locked</span><em>{lockedN === 0 ? "Nothing locked" : `${lockedN} need your approval`}</em></li>
                      </ul>
                      <p className="muted">Everything on this page is what a scan opens. Lock a document and visitors have to ask before they see it.</p>
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
                        <div><b>Need another QR?</b><span className="muted">Make a separate code for an event or a printed card. Each one has its own link and scan count.</span></div>
                        <button>Create new QR</button>
                      </form>
                      <h3 className="kit-sec">Tap to share</h3>
                      <TapShare pages={[{ mode: m, label: info.label, icon: info.icon, tapUrl: `${origin}/t/${link.token}` }]} avatar={av(96)} peek={peekTap} save={saveTapCard} />
                    </>}
                    <h3 className="kit-sec">NFC tags<span>{mt.length}</span></h3>
                    {mt.length === 0 && <div className="kit-empty">No tag opens this page yet</div>}
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
                    <form action={addTag} className="card kit-form">
                      <input type="hidden" name="ret" value={m} />
                      <label className="f">New tag nickname</label>
                      <input name="nickname" placeholder="Keychain, desk card…" maxLength={40} />
                      <button>Add tag</button>
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
                actions={<form action={saveMode} className="card kit-form">
                  <input type="hidden" name="mode" value={m} />
                  <input type="hidden" name="ret" value="kit" />
                  <h3>Actions &amp; privacy</h3>
                  <label className="kit-toggle"><input type="checkbox" name="approval" defaultChecked={!!cfg?.requireApproval} /><span><b>Visitors need my approval</b><span className="muted" style={{ display: "block" }}>People who scan see only your name and a request form until you approve them in Contacts.</span></span></label>
                  <label className="f">Intro message</label>
                  <textarea name="intro" rows={2} maxLength={240} defaultValue={cfg?.intro ?? ""} placeholder={`A short hello for ${info.label.toLowerCase()} visitors`} />
                  <label className="f">Button label</label>
                  <input name="cta" defaultValue={cfg?.ctaLabel ?? info.cta} />
                  <label className="f">Booking link</label>
                  <input name="url" defaultValue={cfg?.bookingUrl ?? ""} placeholder="Calendly, Cal.com, Google Calendar…" inputMode="url" autoCapitalize="none" />
                  {cfg?.bookingUrl && (() => { const b = bookingInfo(cfg.bookingUrl, host); return b && <p className="muted" style={{ margin: "6px 2px 0" }}>{b.provider}{b.embed ? " · visitors book right on your page" : " · opens the booking page"}</p>; })()}
                  <label className="kit-toggle"><input type="checkbox" name="on" value="off" defaultChecked={cfg?.isEnabled === false} /><span>Hide this mode for now</span></label>
                  <button>Save</button>
                </form>} />
            </div>
          );
        })}
      </Swiper>
    </>
  );
}

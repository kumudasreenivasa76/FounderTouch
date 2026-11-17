import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import Icon from "@/components/icon";
import { SocialIcon } from "@/components/social-icon";
import CopyButton from "@/components/copy-button";
import PreviewLink from "@/components/preview-link";
import { LINK_THEMES, autoLinks, hiddenAuto, linkIcon, linkTheme, normUrl, shortUrl } from "@/lib/link-page";
import { addLink, addHeading, saveLink, toggleLink, featureLink, moveLink, deleteLink, setLinkTheme, toggleAuto, toggleSearchable } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Link page" };

const ERR: Record<string, string> = {
  url: "That address doesn't look right. Use a web link, an email address or a phone number.",
  heading: "Give the heading a name.",
  max: "You have reached 40 items. Remove one to add another.",
  theme: "That look isn't available.",
  gone: "That item no longer exists.",
};

const Arrow = ({ up }: { up: boolean }) => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><path d={up ? "M8 13V3.5M3.5 7.5 8 3l4.5 4.5" : "M8 3v9.5M3.5 8.5 8 13l4.5-4.5"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Star = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
);

/** The owner's editor for their public link page at /handle: their own links, the ones built from their profile, and the look. */
export default async function Links({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const items = await db.bioLink.findMany({ where: { profileId: profile.id }, orderBy: { order: "asc" } });
  const links = items.filter((l) => l.kind === "LINK");
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const pageUrl = `${origin}/${profile.handle}`;
  const qr = await QRCode.toDataURL(pageUrl, { errorCorrectionLevel: "M", margin: 1, width: 600, color: { dark: "#241a4d", light: "#ffffff" } });
  const hidden = hiddenAuto(profile.linkHidden);
  const own = new Set(links.map((l) => normUrl(l.url)));
  const auto = (await autoLinks(profile.id, profile.handle)).filter((x) => !own.has(normUrl(x.href)));
  const clicks = links.reduce((n, l) => n + l.clicks, 0);
  const rate = profile.linkViews > 0 ? Math.min(100, Math.round((clicks / profile.linkViews) * 100)) : 0;
  const theme = linkTheme(profile.linkTheme);
  const anyFeatured = links.some((l) => l.featured);

  return (
    <div className="lk-edit">
      <Link href="/app" className="muted">← Back</Link>
      <div className="kit-lux-top share-top" style={{ marginTop: 10 }}>
        <i className="kit-lux-ic" aria-hidden><Icon name="link" size={24} /></i>
        <div>
          <b>Your link page</b>
          <span>One address for everything you share</span>
        </div>
      </div>
      {sp.saved && <div className="ok">Saved</div>}
      {sp.err && <div className="err">{ERR[sp.err] ?? "Something went wrong."}</div>}

      <div className="lk-url">
        <code>{pageUrl.replace(/^https?:\/\//, "")}</code>
        <CopyButton text={pageUrl} />
        <PreviewLink className="lk-open" href={`/${profile.handle}`} title="Link page preview">Preview</PreviewLink>
      </div>
      <div className="share-stats">
        <div><b>{profile.linkViews}</b><span>{profile.linkViews === 1 ? "View" : "Views"}</span></div>
        <div><b>{clicks}</b><span>{clicks === 1 ? "Click" : "Clicks"}</span></div>
        <div><b>{rate}%</b><span>Click rate</span></div>
      </div>
      <details className="lk-qr">
        <summary><span>QR code for this page</span></summary>
        <img src={qr} alt={`QR code that opens ${profile.name}'s link page`} width={200} height={200} />
        <a className="lk-qr-save" href={qr} download={`${profile.handle}-links-qr.png`}>Save QR image</a>
      </details>

      <form action={toggleSearchable} className="lk-search">
        <span><b>Show in search engines</b><small>{profile.searchable ? "Google and others may list your pages." : "Search engines are asked not to list your pages."}</small></span>
        <button type="submit" role="switch" aria-checked={profile.searchable} aria-label="Show my pages in search engines" className="doc-sw"><span /></button>
      </form>

      <nav className="lk-jump" aria-label="Sections">
        <a href="#add">1 · Add</a><a href="#mine">2 · Arrange</a><a href="#auto">3 · From profile</a><a href="#look">4 · Look</a>
      </nav>

      <h3 className="kit-sec" id="add">Add a link</h3>
      <form action={addLink} className="card kit-form kit-lux lk-add">
        <label className="f" htmlFor="lk-title" style={{ marginTop: 14 }}>Title</label>
        <input id="lk-title" name="title" maxLength={60} placeholder="e.g. Book a call, My portfolio" />
        <label className="f" htmlFor="lk-url">Address</label>
        <input id="lk-url" name="url" maxLength={500} required placeholder="https://, an email or a phone number" inputMode="url" autoCapitalize="none" />
        <p className="kit-note">The icon is chosen for you from the address.</p>
        <button>Add link</button>
      </form>
      <form action={addHeading} className="lk-head-add">
        <input name="title" maxLength={60} required placeholder="Or add a heading, e.g. Work, Social" aria-label="Heading" />
        <button>Add heading</button>
      </form>

      <h3 className="kit-sec" id="mine">Your links<span>{links.length}</span></h3>
      {items.length === 0 && <div className="kit-empty">No links of your own yet. Add one above and it goes to the top of your page.</div>}
      {items.map((l, i) => {
        const g = linkIcon(l.url);
        const featured = l.kind === "LINK" && (l.featured || (!anyFeatured && l.id === links[0]?.id));
        const mv = (
          <>
            <form action={moveLink}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="dir" value="up" /><button className="lk-mv" disabled={i === 0} aria-label={`Move ${l.title} up`}><Arrow up /></button></form>
            <form action={moveLink}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="dir" value="down" /><button className="lk-mv" disabled={i === items.length - 1} aria-label={`Move ${l.title} down`}><Arrow up={false} /></button></form>
          </>
        );
        if (l.kind === "HEADER") return (
          <div key={l.id} className="doc lk lk-h">
            <div className="lk-row" style={{ marginTop: 0 }}>
              <span className="lk-auto-tag">Heading</span>
              <b className="lk-h-t">{l.title}</b>
              {mv}
              <form action={deleteLink}><input type="hidden" name="id" value={l.id} /><button className="doc-del" aria-label={`Remove heading ${l.title}`}>Remove</button></form>
            </div>
            <details className="doc-more">
              <summary><span>Rename</span><em /></summary>
              <form action={saveLink} className="doc-opt">
                <input type="hidden" name="id" value={l.id} />
                <div className="doc-line"><input name="title" maxLength={60} defaultValue={l.title} aria-label="Heading" /><button>Save</button></div>
              </form>
            </details>
          </div>
        );
        return (
          <div key={l.id} className={"doc lk" + (l.enabled ? "" : " off")}>
            <div className="doc-top">
              <i className="doc-ic" aria-hidden>{g.social ? <SocialIcon k={g.social} size={20} /> : <Icon name={g.icon} size={22} />}</i>
              <div className="doc-main">
                <b>{l.title}</b>
                <span className="doc-src">{shortUrl(l.url)}</span>
                <span className="lk-clicks">{l.clicks} {l.clicks === 1 ? "click" : "clicks"}{featured ? " · highlighted" : ""}{l.enabled ? "" : " · hidden"}</span>
              </div>
              <form action={toggleLink}>
                <input type="hidden" name="id" value={l.id} />
                <button type="submit" role="switch" aria-checked={l.enabled} aria-label={`Show ${l.title} on my link page`} className="doc-sw"><span /></button>
              </form>
            </div>
            <div className="lk-row">
              {mv}
              <form action={featureLink}><input type="hidden" name="id" value={l.id} /><button className={"lk-ft" + (l.featured ? " on" : "")} aria-pressed={l.featured}><Star on={l.featured} />{l.featured ? "Highlighted" : "Highlight"}</button></form>
              <form action={deleteLink} style={{ marginLeft: "auto" }}><input type="hidden" name="id" value={l.id} /><button className="doc-del" aria-label={`Remove ${l.title}`}>Remove</button></form>
            </div>
            <details className="doc-more">
              <summary><span>Edit</span><em /></summary>
              <form action={saveLink} className="doc-opt">
                <input type="hidden" name="id" value={l.id} />
                <label className="doc-opt-t" htmlFor={"t-" + l.id}>Title</label>
                <div className="doc-line"><input id={"t-" + l.id} name="title" maxLength={60} defaultValue={l.title} /></div>
                <label className="doc-opt-t" htmlFor={"u-" + l.id} style={{ marginTop: 10 }}>Address</label>
                <div className="doc-line">
                  <input id={"u-" + l.id} name="url" maxLength={500} defaultValue={l.url} inputMode="url" autoCapitalize="none" />
                  <button>Save</button>
                </div>
              </form>
            </details>
          </div>
        );
      })}

      <h3 className="kit-sec" id="auto">From your profile<span>{auto.filter((x) => !hidden.has(x.key)).length}/{auto.length}</span></h3>
      {auto.length === 0 && <div className="kit-empty">Nothing yet. Set up a mode, or add a website or booking link, and it appears here.</div>}
      {auto.map((x) => {
        const on = !hidden.has(x.key);
        return (
          <div key={x.key} className={"doc lk-auto" + (on ? "" : " off")}>
            <div className="doc-top">
              <i className="doc-ic" aria-hidden>{x.mode ? <Icon mode={x.mode} size={22} /> : <Icon name={x.icon} size={22} />}</i>
              <div className="doc-main"><b>{x.title}</b><span className="doc-src">{x.sub}</span></div>
              <form action={toggleAuto}>
                <input type="hidden" name="key" value={x.key} />
                <button type="submit" role="switch" aria-checked={on} aria-label={`Show ${x.title} on my link page`} className="doc-sw"><span /></button>
              </form>
            </div>
          </div>
        );
      })}
      {auto.length > 0 && <p className="mode-add-note">These come from your profile and sit below your own links. Switch one off to keep it off your link page.</p>}

      <h3 className="kit-sec" id="look">Look</h3>
      <div className="lk-themes">
        {LINK_THEMES.map((t) => (
          <form key={t.key} action={setLinkTheme}>
            <input type="hidden" name="theme" value={t.key} />
            <button className={"lk-theme lt-t-" + t.key + (t.key === theme ? " on" : "")} aria-pressed={t.key === theme} aria-label={`${t.name} look`}>
              <span className="lk-mock" aria-hidden><i /><b className="feat" /><b /><b /></span>
              <span className="lk-theme-n">{t.name}</span>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

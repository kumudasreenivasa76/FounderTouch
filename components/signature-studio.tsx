"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { SIG_STYLES, renderSignature, type SigData, type SigOpts } from "@/lib/signature";

type Page = { mode: string; label: string; url: string };
type Props = {
  base: Omit<SigData, "cardUrl" | "qrUrl">;
  pages: Page[];
  qrBase: string;            // absolute URL of the QR image route, without ?mode=
  initial: SigOpts;
  hasPhoto: boolean;
  hasLogo: boolean;
  save: (json: string) => Promise<void>;
};

const HOWTO: Record<string, string[]> = {
  Gmail: ["Press Copy signature.", "In Gmail open Settings, then See all settings.", "Under General, find Signature and choose Create new.", "Paste, then Save changes at the bottom."],
  Outlook: ["Press Copy signature.", "In Outlook open Settings, then Mail, then Compose and reply.", "Paste into the signature box.", "Choose it for new messages and replies, then Save."],
  "Apple Mail": ["Press Copy signature.", "In Mail open Settings, then Signatures.", "Add a signature with the + button and paste.", "Untick Always match my default message font so the design is kept."],
};

/** Email signature studio: pick a design, switch details on and off, and copy the result into a mail app. */
export default function SignatureStudio({ base, pages, qrBase, initial, hasPhoto, hasLogo, save }: Props) {
  const [o, setO] = useState<SigOpts>(initial);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(true);
  const [client, setClient] = useState("Gmail");
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  const page = pages.find((p) => p.mode === o.mode) ?? pages[0];
  const html = useMemo(
    () => renderSignature({ ...base, cardUrl: page.url, qrUrl: `${qrBase}?mode=${page.mode}` }, o),
    [base, page, qrBase, o],
  );
  const set = <K extends keyof SigOpts>(k: K, v: SigOpts[K]) => { setO((p) => ({ ...p, [k]: v })); setSaved(false); };
  const flash = (t: string) => { setNote(t); setTimeout(() => setNote(""), 2200); };

  const copyRich = async () => {
    try {
      if (!navigator.clipboard || !("ClipboardItem" in window)) throw new Error("fallback");
      await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([box.current?.innerText ?? ""], { type: "text/plain" }) })]);
      flash("Signature copied. Paste it into your mail app.");
    } catch {
      const r = document.createRange(); r.selectNodeContents(box.current!);
      const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r);
      flash(document.execCommand("copy") ? "Signature copied. Paste it into your mail app." : "Select the preview and copy it.");
    }
    if (!saved) persist(false);
  };
  const copyHtml = async () => {
    try { await navigator.clipboard.writeText(html); flash("HTML copied."); } catch { flash("Copying is blocked in this browser. Use Download instead."); }
  };
  const download = () => {
    const blob = new Blob([`<!doctype html><meta charset="utf-8"><title>Email signature</title>${html}`], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "email-signature.html"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const persist = (tell = true) => start(async () => {
    try { await save(JSON.stringify(o)); setSaved(true); if (tell) flash("Saved as your signature."); } catch { flash("Could not save. Try again."); }
  });

  const Toggle = ({ k, label, hint, disabled }: { k: "photo" | "logo" | "phone" | "website" | "socials" | "cta"; label: string; hint?: string; disabled?: boolean }) => (
    <label className={"st-tog" + (disabled ? " dis" : "")}>
      <input type="checkbox" checked={o[k] && !disabled} disabled={disabled} onChange={(e) => set(k, e.target.checked)} />
      <span><b>{label}</b>{hint && <small>{hint}</small>}</span>
    </label>
  );

  return (
    <div className="st">
      <div className="st-side">
        <section className="panel">
          <h3>1 · Design</h3>
          <div className="st-styles" role="radiogroup" aria-label="Signature design">
            {SIG_STYLES.map((s) => (
              <button key={s.key} type="button" role="radio" aria-checked={o.style === s.key} className={"st-style" + (o.style === s.key ? " on" : "")} onClick={() => set("style", s.key)}>
                <span className={"st-thumb t-" + s.key} aria-hidden><i /><b /><b /><b /></span>
                <span className="st-style-n">{s.name}</span>
                <small>{s.hint}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3>2 · What to show</h3>
          <Toggle k="photo" label="Photo" hint={hasPhoto ? "Used by Portrait, Banner and Button" : "Add a profile photo first"} disabled={!hasPhoto} />
          <Toggle k="logo" label="Company logo" hint={hasLogo ? undefined : "Add a logo in your Founder kit first"} disabled={!hasLogo} />
          <Toggle k="phone" label="Phone number" />
          <Toggle k="website" label="Website" />
          <Toggle k="socials" label="Social links" />
          <Toggle k="cta" label="Link to my card" />
          {o.cta && (
            <>
              <label className="st-lbl" htmlFor="st-cta">Link text</label>
              <input id="st-cta" className="st-in" maxLength={40} value={o.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} />
            </>
          )}
          <label className="st-lbl" htmlFor="st-mode">The link opens</label>
          <select id="st-mode" className="st-in" value={page.mode} onChange={(e) => set("mode", e.target.value)}>
            {pages.map((p) => <option key={p.mode} value={p.mode}>{p.label}</option>)}
          </select>
        </section>

        <section className="panel">
          <h3>3 · Legal note <span className="st-opt">optional</span></h3>
          <textarea className="st-in" rows={3} maxLength={600} value={o.disclaimer} placeholder="e.g. This email and any attachments are confidential." onChange={(e) => set("disclaimer", e.target.value)} />
          <p className="muted2 st-count">{o.disclaimer.length}/600 · shown in small grey text under the signature</p>
        </section>
      </div>

      <div className="st-main">
        <section className="panel">
          <div className="st-head">
            <h3>Preview</h3>
            <span className={"st-saved" + (saved ? " ok" : "")}>{saved ? "Saved" : "Not saved yet"}</span>
          </div>
          <div className="st-mail">
            <div className="st-mail-bar"><i /><i /><i /><span>New message</span></div>
            <div className="st-mail-body">
              <p>Hi Sam,</p>
              <p>Good to meet you today. Here are the details we talked about.</p>
              <p>Best,</p>
              <div ref={box} className="st-sig" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </div>
          <div className="st-actions">
            <button type="button" className="st-primary" onClick={copyRich}>Copy signature</button>
            <button type="button" onClick={() => persist()} disabled={pending || saved}>{pending ? "Saving" : "Save as mine"}</button>
            <button type="button" onClick={copyHtml}>Copy HTML</button>
            <button type="button" onClick={download}>Download .html</button>
          </div>
          <p className="st-note" role="status">{note}</p>
        </section>

        <section className="panel">
          <h3>Add it to your mail app</h3>
          <div className="range st-tabs" role="tablist" aria-label="Mail app">
            {Object.keys(HOWTO).map((c) => <button key={c} type="button" role="tab" aria-selected={client === c} className={client === c ? "on" : ""} onClick={() => setClient(c)}>{c}</button>)}
          </div>
          <ol className="howto">{HOWTO[client].map((s) => <li key={s}>{s}</li>)}</ol>
          <p className="muted2">Photos, logos and the QR code load from your TapNodd address, so they appear once the site is online. On this local copy they only show on this computer.</p>
        </section>
      </div>
    </div>
  );
}

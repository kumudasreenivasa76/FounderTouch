"use client";
import { useState, useTransition } from "react";
import { BG_STYLES, bgQuery, type BgOpts } from "@/lib/background";

type Page = { mode: string; label: string };
type Props = { handle: string; brand: string; pages: Page[]; initial: BgOpts; hasLogo: boolean; save: (json: string) => Promise<void> };

const HOWTO: Record<string, string[]> = {
  Zoom: ["Download the image.", "Open Zoom Settings, then Background and effects.", "Under Virtual backgrounds, press + and choose Add image.", "Pick the downloaded file. Turn off Mirror my video to read it the right way round."],
  "Google Meet": ["Download the image.", "In a call, open More options, then Apply visual effects.", "Under Backgrounds, press the + tile to upload.", "Pick the downloaded file."],
  Teams: ["Download the image.", "Before joining, open Effects and avatars, then Video effects.", "Choose Add new and upload the file.", "Select it and press Apply."],
};

/** Video-call background studio: pick a design, choose what appears on it, download the 1920x1080 image. */
export default function BackgroundStudio({ handle, brand, pages, initial, hasLogo, save }: Props) {
  const [o, setO] = useState<BgOpts>(initial);
  const [saved, setSaved] = useState(true);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState("Zoom");
  const [pending, start] = useTransition();

  const set = <K extends keyof BgOpts>(k: K, v: BgOpts[K]) => { setO((p) => ({ ...p, [k]: v })); setSaved(false); setLoading(true); };
  const src = `/card/${handle}/background?${bgQuery(o)}`;
  const flash = (t: string) => { setNote(t); setTimeout(() => setNote(""), 2200); };
  const persist = () => start(async () => {
    try { await save(JSON.stringify(o)); setSaved(true); flash("Saved as your background."); } catch { flash("Could not save. Try again."); }
  });

  const Toggle = ({ k, label, hint, disabled }: { k: "qr" | "title" | "address" | "logo"; label: string; hint?: string; disabled?: boolean }) => (
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
          <div className="st-styles" role="radiogroup" aria-label="Background design">
            {BG_STYLES.map((s) => (
              <button key={s.key} type="button" role="radio" aria-checked={o.style === s.key} className={"st-style" + (o.style === s.key ? " on" : "")} onClick={() => set("style", s.key)}>
                <span className={"st-bgthumb b-" + s.key} style={s.key === "brand" ? { background: brand } : s.key === "split" ? { ["--band" as string]: brand } : { background: s.swatch }} aria-hidden><i /><b /></span>
                <span className="st-style-n">{s.name}</span>
                <small>{s.hint}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3>2 · What to show</h3>
          <Toggle k="title" label="Job title and company" />
          <Toggle k="address" label="Your web address" />
          <Toggle k="logo" label="Company logo" hint={hasLogo ? "Shown in the top corner" : "Add a logo in your Founder kit first"} disabled={!hasLogo} />
          <Toggle k="qr" label="QR code" hint="People on the call can scan it from their screen" />
          {o.qr && (
            <>
              <label className="st-lbl" htmlFor="bg-mode">The QR opens</label>
              <select id="bg-mode" className="st-in" value={pages.some((p) => p.mode === o.mode) ? o.mode : pages[0]?.mode} onChange={(e) => set("mode", e.target.value)}>
                {pages.map((p) => <option key={p.mode} value={p.mode}>{p.label}</option>)}
              </select>
              <label className="st-lbl" htmlFor="bg-label">Text under the QR</label>
              <input id="bg-label" className="st-in" maxLength={30} value={o.label} onChange={(e) => setO((p) => ({ ...p, label: e.target.value }))} onBlur={() => { setSaved(false); setLoading(true); }} />
              <span className="st-lbl">QR position</span>
              <div className="range st-tabs" role="radiogroup" aria-label="QR position">
                {(["left", "right"] as const).map((s) => <button key={s} type="button" role="radio" aria-checked={o.side === s} className={o.side === s ? "on" : ""} onClick={() => set("side", s)}>{s === "left" ? "Bottom left" : "Bottom right"}</button>)}
              </div>
            </>
          )}
        </section>
      </div>

      <div className="st-main">
        <section className="panel">
          <div className="st-head">
            <h3>Preview</h3>
            <span className={"st-saved" + (saved ? " ok" : "")}>{saved ? "Saved" : "Not saved yet"}</span>
          </div>
          <div className={"st-screen" + (loading ? " loading" : "")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={src} src={src} alt="Your video-call background" onLoad={() => setLoading(false)} onError={() => { setLoading(false); flash("The preview could not be drawn. Check that this page is switched on."); }} />
            <span className="st-you" aria-hidden><i /><b /></span>
          </div>
          <p className="muted2" style={{ margin: "8px 0 0" }}>The grey outline shows roughly where you sit, so you can see that your name and QR stay clear.</p>
          <div className="st-actions">
            <a className="st-primary" href={src} download={`${handle}-background.png`}>Download image · 1920 × 1080</a>
            <button type="button" onClick={persist} disabled={pending || saved}>{pending ? "Saving" : "Save as mine"}</button>
            <a href={src} target="_blank" rel="noopener noreferrer">Open full size</a>
          </div>
          <p className="st-note" role="status">{note}</p>
        </section>

        <section className="panel">
          <h3>Set it in your video app</h3>
          <div className="range st-tabs" role="tablist" aria-label="Video app">
            {Object.keys(HOWTO).map((c) => <button key={c} type="button" role="tab" aria-selected={app === c} className={app === c ? "on" : ""} onClick={() => setApp(c)}>{c}</button>)}
          </div>
          <ol className="howto">{HOWTO[app].map((s) => <li key={s}>{s}</li>)}</ol>
        </section>
      </div>
    </div>
  );
}

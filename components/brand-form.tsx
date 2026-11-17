"use client";
import { useRef, useState } from "react";

/** The most common strong colour in RGBA pixel data, ignoring white, grey and transparent pixels. */
export function dominantFromPixels(d: ArrayLike<number>): string | null {
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
    if (a < 128 || (r > 235 && g > 235 && b > 235) || Math.max(r, g, b) - Math.min(r, g, b) < 24) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    e.r += r; e.g += g; e.b += b; e.n++;
    buckets.set(key, e);
  }
  type Bucket = { r: number; g: number; b: number; n: number };
  let best: Bucket | undefined;
  for (const e of Array.from(buckets.values())) if (!best || e.n > best.n) best = e;
  if (!best) return null;
  const top: Bucket = best;
  const hx = (v: number) => Math.round(v / top.n).toString(16).padStart(2, "0");
  return `#${hx(top.r)}${hx(top.g)}${hx(top.b)}`;
}
function dominantColour(img: HTMLImageElement): string | null {
  const c = document.createElement("canvas"), n = 64;
  c.width = c.height = n;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, n, n);
  return dominantFromPixels(ctx.getImageData(0, 0, n, n).data);
}
function darken(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - amt)));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}
function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export default function BrandForm({ action, logoSrc, color1, color2, company, ret }: { action: (fd: FormData) => void; logoSrc: string; color1: string; color2: string; company: string; ret?: string }) {
  const [c1, setC1] = useState(color1);
  const [c2, setC2] = useState(color2);
  const [preview, setPreview] = useState(logoSrc);
  const [note, setNote] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { alert("Please choose a logo under 2 MB."); if (file.current) file.current.value = ""; return; }
    const url = URL.createObjectURL(f);
    setPreview(url);
    const img = new Image();
    img.onload = () => {
      const col = dominantColour(img);
      if (col) { setC1(col); setC2(darken(col, 0.35)); setNote("Colours suggested from your logo. Change them if you like."); }
      else setNote("Your logo is black, white or grey, so pick your brand colours below.");
    };
    img.src = url;
  };
  const light = luminance(c1) > 0.6 && luminance(c2) > 0.6;

  const PRESETS: [string, string, string][] = [
    ["Violet", "#1f4fd8", "#3d6bea"], ["Ocean", "#1d4ed8", "#0ea5e9"], ["Forest", "#047857", "#10b981"],
    ["Sunset", "#ea580c", "#dc2626"], ["Rose", "#be185d", "#ec4899"], ["Slate", "#1f2937", "#475569"],
  ];

  return (
    <form action={action} className="card kit-form kit-lux bf">
      {ret && <input type="hidden" name="ret" value={ret} />}
      <div className="bf-card" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
        <div>
          <b>{company || "Your company"}</b>
          <span>This is how your card will look</span>
        </div>
        {preview ? <img src={preview} alt="" /> : <i>No logo yet</i>}
      </div>

      <div className="kit-group" style={{ marginTop: 14 }}>
        <b className="kit-group-t">Logo</b>
        <div className="bf-logo">
          <label className="bf-pick">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 15V4.5M7.5 9 12 4.5l4.5 4.5M5 14v3.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V14" /></svg>
            {preview ? "Change logo" : "Choose logo"}
            <input ref={file} name="logo" type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <span className="bf-hint">PNG, JPG or WebP, up to 2 MB</span>
        </div>
        {logoSrc && <label className="kit-toggle"><input type="checkbox" name="rm_logo" /><span><b>Remove my logo</b></span></label>}
        {note && <p className="kit-note ok">{note}</p>}
      </div>

      <div className="kit-group">
        <b className="kit-group-t">Colours</b>
        <div className="bf-presets" role="group" aria-label="Ready-made colour pairs">
          {PRESETS.map(([n, a1, a2]) => (
            <button key={n} type="button" aria-label={`${n} colours`} aria-pressed={c1 === a1 && c2 === a2} className={c1 === a1 && c2 === a2 ? "on" : ""} onClick={() => { setC1(a1); setC2(a2); setNote(""); }}>
              <i style={{ background: `linear-gradient(135deg, ${a1}, ${a2})` }} /><span>{n}</span>
            </button>
          ))}
        </div>
        <div className="bf-colors">
          <label><input type="color" name="color1" value={c1} onChange={(e) => setC1(e.target.value)} aria-label="Main colour" /><span><b>Main colour</b><small>{c1.toUpperCase()}</small></span></label>
          <label><input type="color" name="color2" value={c2} onChange={(e) => setC2(e.target.value)} aria-label="Second colour" /><span><b>Second colour</b><small>{c2.toUpperCase()}</small></span></label>
        </div>
        {light && <div className="err" style={{ marginTop: 10 }}>These colours are very light, so the white text on your card will be hard to read. Pick a darker colour.</div>}
        <label className="kit-toggle"><input type="checkbox" name="reset" /><span><b>Go back to a preset card theme</b><span className="muted" style={{ display: "block" }}>Drops your own colours and uses a standard theme.</span></span></label>
      </div>
      <button>Save logo and colours</button>
    </form>
  );
}

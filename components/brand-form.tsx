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

export default function BrandForm({ action, logoSrc, color1, color2, company }: { action: (fd: FormData) => void; logoSrc: string; color1: string; color2: string; company: string }) {
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

  return (
    <form action={action} className="card">
      <h3>Company logo &amp; colours</h3>
      <p className="muted" style={{ marginTop: 0 }}>Your logo shows on your digital card and page, and your colours replace the preset theme everywhere.</p>

      <div style={{ height: 78, borderRadius: 14, background: `linear-gradient(135deg, ${c1}, ${c2})`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", color: "#fff", marginBottom: 10 }}>
        <b style={{ fontSize: 17 }}>{company || "Your company"}</b>
        {preview ? <img src={preview} alt="" style={{ height: 42, maxWidth: 110, objectFit: "contain", background: "#fff", borderRadius: 10, padding: 4 }} /> : <span style={{ opacity: 0.8, fontSize: 12 }}>No logo yet</span>}
      </div>

      <label className="f" style={{ marginTop: 0 }}>Logo (PNG, JPG or WebP, up to 2 MB)</label>
      <input ref={file} name="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onFile(e.target.files?.[0])} />
      {logoSrc && <label style={{ display: "block", margin: "0 0 8px" }}><input type="checkbox" name="rm_logo" />Remove my logo</label>}
      {note && <div className="muted" style={{ marginBottom: 8 }}>{note}</div>}

      <div className="row">
        <div><label className="f">Main colour</label><input type="color" name="color1" value={c1} onChange={(e) => setC1(e.target.value)} style={{ padding: 2, height: 44 }} /></div>
        <div><label className="f">Second colour</label><input type="color" name="color2" value={c2} onChange={(e) => setC2(e.target.value)} style={{ padding: 2, height: 44 }} /></div>
      </div>
      {light && <div className="err">These colours are very light, so white text on your card will be hard to read. Pick a darker colour.</div>}
      <label style={{ display: "block", margin: "6px 0 10px" }}><input type="checkbox" name="reset" />Go back to a preset colour theme</label>
      <button>Save logo &amp; colours</button>
    </form>
  );
}

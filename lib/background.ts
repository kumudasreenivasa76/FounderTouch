/** Video-call background designs. Each is drawn at 1920x1080 by /card/<handle>/background. */
export const BG_STYLES = [
  { key: "brand", name: "Brand", hint: "Your card colours", swatch: "" },
  { key: "aurora", name: "Aurora", hint: "Violet to pink", swatch: "linear-gradient(135deg,#7c3aed,#a855f7 50%,#f0abfc)" },
  { key: "midnight", name: "Midnight", hint: "Deep and calm", swatch: "linear-gradient(160deg,#120d2b,#2a1b5e)" },
  { key: "studio", name: "Studio", hint: "Charcoal with an accent line", swatch: "linear-gradient(180deg,#1b1e25,#0f1115)" },
  { key: "paper", name: "Paper", hint: "Light and airy", swatch: "linear-gradient(160deg,#ffffff,#ece5fb)" },
  { key: "split", name: "Split", hint: "A colour band at the side", swatch: "" },
] as const;
export type BgStyle = (typeof BG_STYLES)[number]["key"];

export type BgOpts = {
  style: BgStyle;
  mode: string;            // which page the QR opens
  qr: boolean;
  side: "right" | "left";  // where the QR sits
  title: boolean;          // headline under the name
  address: boolean;        // the short web address under the name
  logo: boolean;
  label: string;           // text under the QR
};
export const BG_DEFAULTS: BgOpts = { style: "brand", mode: "ALL", qr: true, side: "right", title: true, address: true, logo: false, label: "Scan to connect" };

export function parseBgPrefs(raw: string | null | undefined): BgOpts {
  let o: Partial<BgOpts> = {};
  try { o = JSON.parse(raw || "{}") ?? {}; } catch { o = {}; }
  const b = (k: "qr" | "title" | "address" | "logo") => (typeof o[k] === "boolean" ? o[k]! : BG_DEFAULTS[k]);
  return {
    style: BG_STYLES.some((s) => s.key === o.style) ? (o.style as BgStyle) : BG_DEFAULTS.style,
    mode: typeof o.mode === "string" && /^[A-Z]{2,12}$/.test(o.mode) ? o.mode : "ALL",
    qr: b("qr"), title: b("title"), address: b("address"), logo: b("logo"),
    side: o.side === "left" ? "left" : "right",
    label: (typeof o.label === "string" ? o.label : BG_DEFAULTS.label).slice(0, 30),
  };
}

/** The same options as a query string, so the image route can draw a design before it is saved. */
export function bgQuery(o: BgOpts): string {
  const q = new URLSearchParams({ style: o.style, mode: o.mode, qr: o.qr ? "1" : "0", side: o.side, title: o.title ? "1" : "0", address: o.address ? "1" : "0", logo: o.logo ? "1" : "0", label: o.label });
  return q.toString();
}

/** Options from a query string, falling back to the saved ones for anything not given. */
export function bgFromQuery(sp: URLSearchParams, saved: BgOpts): BgOpts {
  const flag = (k: "qr" | "title" | "address" | "logo") => (sp.has(k) ? sp.get(k) === "1" : saved[k]);
  return parseBgPrefs(JSON.stringify({
    style: sp.get("style") ?? saved.style, mode: sp.get("mode") ?? saved.mode, side: sp.get("side") ?? saved.side,
    qr: flag("qr"), title: flag("title"), address: flag("address"), logo: flag("logo"), label: sp.get("label") ?? saved.label,
  }));
}

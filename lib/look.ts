export const THEMES: Record<string, { name: string; from: string; to: string }> = {
  indigo: { name: "Indigo", from: "#3b5bdb", to: "#7048e8" },
  sunset: { name: "Sunset", from: "#f76707", to: "#e03131" },
  emerald: { name: "Emerald", from: "#0ca678", to: "#1098ad" },
  ocean: { name: "Ocean", from: "#1c7ed6", to: "#0b7285" },
  rose: { name: "Rose", from: "#d6336c", to: "#9c36b5" },
  midnight: { name: "Midnight", from: "#212529", to: "#495057" },
};
const CUSTOM = /^custom:(#[0-9a-f]{6}):(#[0-9a-f]{6})$/i;
export const isCustomTheme = (k: string) => CUSTOM.test(k);
export const customTheme = (from: string, to: string) => `custom:${from.toLowerCase()}:${to.toLowerCase()}`;
/** A preset by key, or the company's own two colours. Only validated hex ever reaches the CSS. */
export const themeOf = (k: string) => {
  const m = CUSTOM.exec(k);
  return m ? { name: "Company", from: m[1], to: m[2] } : THEMES[k] ?? THEMES.indigo;
};
export const gradient = (k: string) => `linear-gradient(135deg, ${themeOf(k).from}, ${themeOf(k).to})`;

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb colour. */
export function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round((t - v) * p + v));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/* ---------- Avatar ---------- */
export type AvatarCfg = {
  bg: string; skin: string; face: number;
  hair: string; style: number;
  eyes: string; brows: number; mouth: number;
  glasses: number; beard: number; accessory: number;
  outfit: number; shirt: string;
};

export const AVATAR_DEFAULT: AvatarCfg = {
  bg: "#dbe4ff", skin: "#eab98a", face: 0, hair: "#2b1b12", style: 0,
  eyes: "#3b2a1d", brows: 0, mouth: 0, glasses: 0, beard: 0, accessory: 0, outfit: 0, shirt: "#3b5bdb",
};

/** Names for each numbered option, and the colour palettes. */
export const AVATAR_OPTS = {
  face: ["Round", "Oval", "Square"],
  style: ["Short", "Long", "Bun", "Curly", "Bald", "Swoop", "Ponytail", "Buzz"],
  brows: ["Soft", "Bold", "Arched", "Flat"],
  mouth: ["Smile", "Grin", "Calm", "Open", "Smirk"],
  glasses: ["None", "Round", "Square", "Shades"],
  beard: ["None", "Stubble", "Moustache", "Beard"],
  accessory: ["None", "Headphones", "Earring", "Cap"],
  outfit: ["T-shirt", "Hoodie", "Blazer", "Turtleneck"],
  skin: ["#ffdfc4", "#f6c9a0", "#eab98a", "#d79f6e", "#b9784a", "#8d5524", "#6b3f20", "#4a2a15"],
  hair: ["#0f0f10", "#2b1b12", "#4a2f1e", "#7a4a26", "#c28a3d", "#e3c46d", "#b23a48", "#6c3fc2", "#2a8fbd", "#9aa0a6"],
  eyes: ["#3b2a1d", "#6b4423", "#5a7a3a", "#3b6fb5", "#5c6770", "#2f8f7f"],
  shirt: ["#3b5bdb", "#0ca678", "#e8590c", "#d6336c", "#212529", "#7048e8", "#f1b72a", "#868e96"],
  bg: ["#dbe4ff", "#ffe3e3", "#d3f9d8", "#fff3bf", "#e5dbff", "#c5f6fa", "#ffd8a8", "#dee2e6"],
};

/** Normalises older saved avatars (boolean glasses, 5 hair styles, no face/eyes…) into the current shape. */
export function parseAvatar(s: string): AvatarCfg | null {
  if (!s) return null;
  try {
    const o = JSON.parse(s) as Record<string, unknown>;
    const g = o.glasses;
    const cfg = { ...AVATAR_DEFAULT, ...o, glasses: typeof g === "boolean" ? (g ? 1 : 0) : Number(g ?? 0) } as AvatarCfg;
    const bound = (v: number, n: number) => (Number.isInteger(v) && v >= 0 && v < n ? v : 0);
    cfg.face = bound(cfg.face, 3); cfg.style = bound(cfg.style, 8); cfg.brows = bound(cfg.brows, 4); cfg.mouth = bound(cfg.mouth, 5);
    cfg.glasses = bound(cfg.glasses, 4); cfg.beard = bound(cfg.beard, 4); cfg.accessory = bound(cfg.accessory, 4); cfg.outfit = bound(cfg.outfit, 4);
    return cfg;
  } catch { return null; }
}


/** Server-side guard for a saved avatar: bounds every number, checks every colour, returns clean JSON. */
export function sanitizeAvatar(raw: string): string | null {
  const cfg = parseAvatar(raw);
  if (!cfg) return null;
  const hex = /^#[0-9a-f]{6}$/i;
  for (const k of ["bg", "skin", "hair", "eyes", "shirt"] as const) if (!hex.test(cfg[k])) cfg[k] = AVATAR_DEFAULT[k];
  return JSON.stringify({ bg: cfg.bg, skin: cfg.skin, face: cfg.face, hair: cfg.hair, style: cfg.style, eyes: cfg.eyes, brows: cfg.brows, mouth: cfg.mouth, glasses: cfg.glasses, beard: cfg.beard, accessory: cfg.accessory, outfit: cfg.outfit, shirt: cfg.shirt });
}

/** A pleasant starter avatar derived from a seed (the handle), so every new profile begins with a face. */
export function seededAvatar(seed: string): AvatarCfg {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const n = (salt: number, len: number) => { const x = Math.imul(h ^ (salt * 2654435761), 40503) >>> 16; return x % len; };
  const pick = <T,>(a: readonly T[], salt: number) => a[n(salt, a.length)];
  return {
    bg: pick(AVATAR_OPTS.bg, 1), skin: pick(AVATAR_OPTS.skin, 2), face: n(3, 3),
    hair: pick(AVATAR_OPTS.hair, 4), style: n(5, 8), eyes: pick(AVATAR_OPTS.eyes, 6),
    brows: n(7, 4), mouth: n(8, 5) === 3 ? 0 : n(8, 5), // "Open" is an odd default
    glasses: n(9, 10) < 3 ? 1 + n(9, 3) : 0, beard: n(10, 10) < 3 ? 1 + n(10, 3) : 0,
    accessory: 0, outfit: n(11, 4), shirt: pick(AVATAR_OPTS.shirt, 12),
  };
}

/** One-tap starting looks. */
export const AVATAR_PRESETS: AvatarCfg[] = [
  { ...AVATAR_DEFAULT },
  { bg: "#ffe3e3", skin: "#d79f6e", face: 1, hair: "#0f0f10", style: 1, eyes: "#3b2a1d", brows: 2, mouth: 0, glasses: 0, beard: 0, accessory: 2, outfit: 2, shirt: "#d6336c" },
  { bg: "#d3f9d8", skin: "#b9784a", face: 2, hair: "#0f0f10", style: 7, eyes: "#3b2a1d", brows: 1, mouth: 1, glasses: 2, beard: 3, accessory: 0, outfit: 1, shirt: "#0ca678" },
  { bg: "#fff3bf", skin: "#f6c9a0", face: 0, hair: "#e3c46d", style: 5, eyes: "#3b6fb5", brows: 0, mouth: 4, glasses: 0, beard: 1, accessory: 0, outfit: 0, shirt: "#f1b72a" },
  { bg: "#e5dbff", skin: "#8d5524", face: 0, hair: "#0f0f10", style: 3, eyes: "#3b2a1d", brows: 3, mouth: 0, glasses: 1, beard: 0, accessory: 1, outfit: 3, shirt: "#7048e8" },
  { bg: "#c5f6fa", skin: "#ffdfc4", face: 1, hair: "#b23a48", style: 6, eyes: "#5a7a3a", brows: 2, mouth: 3, glasses: 0, beard: 0, accessory: 3, outfit: 0, shirt: "#212529" },
  { bg: "#dee2e6", skin: "#6b3f20", face: 2, hair: "#9aa0a6", style: 4, eyes: "#3b2a1d", brows: 1, mouth: 2, glasses: 3, beard: 2, accessory: 0, outfit: 2, shirt: "#212529" },
  { bg: "#ffd8a8", skin: "#eab98a", face: 0, hair: "#7a4a26", style: 2, eyes: "#6b4423", brows: 0, mouth: 0, glasses: 1, beard: 0, accessory: 0, outfit: 1, shirt: "#e8590c" },
];

/** "Founder · Lumen Labs", without repeating the company when the headline already says it. */
export function byline(headline: string, company: string): string {
  const h = headline.trim(), c = company.trim();
  if (!c) return h;
  if (!h) return c;
  return h.toLowerCase().includes(c.toLowerCase()) ? h : `${h} · ${c}`;
}

/** Darkens a brand colour until text in it is readable on a white background (WCAG AA, 4.5:1). */
export function readable(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#3b5bdb";
  const lum = (rgb: number[]) => { const c = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  let rgb = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  for (let n = 0; n < 40 && 1.05 / (lum(rgb) + 0.05) < 4.5; n++) rgb = rgb.map((v) => Math.round(v * 0.92));
  return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
}

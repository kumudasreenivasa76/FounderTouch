/**
 * Builds app/light.css: the light theme, derived from the dark stylesheets.
 * Every colour in globals.css, ds.css and dashboard.css is mapped to its light
 * counterpart and re-emitted under [data-theme="light"]. Re-run after changing
 * colours in those files:  node scripts/make-light-css.mjs
 * Hand-tuned tokens and fixes live in app/light-tokens.css (loaded after this).
 */
import fs from "fs";
import path from "path";
import postcss from "postcss";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
// Each output must load right after its sources: app/light.css after globals+ds (root layout),
// app/dashboard/dashboard-light.css after dashboard.css (dashboard layout).
const JOBS = [
  { sources: ["app/globals.css", "app/ds.css"], out: "app/light.css" },
  { sources: ["app/dashboard/dashboard.css"], out: "app/dashboard/dashboard-light.css" },
];

// ---------- colour maths ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
function hexToRgb(h) {
  h = h.slice(1);
  if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb(h, s, l) {
  if (!s) return [l * 255, l * 255, l * 255].map(Math.round);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((x) => Math.round(x * 255));
}
const hex = ([r, g, b]) => "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");

// The brand violets map to one light-theme violet, so buttons and links stay on brand.
const FIXED = { "124,92,240": [109, 74, 232], "139,92,246": [109, 74, 232], "167,139,250": [91, 55, 214], "148,105,247": [91, 55, 214] };
/** Dark colour -> light colour. Pure white and black stay (QR codes, text on solid buttons). */
function mapColour(r, g, b, a) {
  const fixed = FIXED[`${r},${g},${b}`];
  if (fixed) return a < 1 ? null : [...fixed, a];
  if (r === 255 && g === 255 && b === 255) return a < 1 ? [17, 24, 39, a] : null; // white hairlines become ink hairlines
  if (r === 0 && g === 0 && b === 0) return a < 1 ? [17, 24, 39, +(a * 0.3).toFixed(3)] : null; // shadows soften
  const [h, s, l] = rgbToHsl(r, g, b);
  let L = l, S = s;
  const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  if (chroma < 0.12) {
    // Neutrals flip. The darkest canvas becomes a soft grey page; panels on it become white;
    // light text becomes ink, mid greys stay readable.
    if (l < 0.5) L = l < 0.075 ? 0.955 : clamp(1 - (l - 0.1) * 0.4, 0.9, 1);
    else L = clamp(1.04 - l, 0.1, 0.5);
    S = Math.min(s, 0.25);
  } else if (a < 1) {
    return null; // soft brand / mode tints read fine on both themes
  } else if (l > 0.62) {
    L = clamp(1.05 - l, 0.3, 0.46); // light accents used as text on dark: deepen for white backgrounds
  } else if (l < 0.3) {
    L = clamp(1 - l * 0.45, 0.86, 0.96); S = Math.min(s, 0.7); // deep tinted panels become pale tints
  } else return null; // mid-tone brand and mode colours keep
  const [R, G, B] = hslToRgb(h, S, L);
  return [R, G, B, a];
}
const fmt = ([r, g, b, a]) => (a < 1 ? `rgba(${r},${g},${b},${+a.toFixed(3)})` : hex([r, g, b]));

const COLOUR = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g;
function mapValue(v) {
  let changed = false;
  const out = v.replace(COLOUR, (m) => {
    let c;
    if (m.startsWith("#")) c = hexToRgb(m);
    else { const n = m.match(/[\d.]+/g).map(Number); c = [n[0], n[1], n[2], n[3] ?? 1]; }
    const nc = mapColour(...c);
    if (!nc) return m;
    changed = true;
    return fmt(nc);
  });
  return changed ? out : null;
}

// ---------- selectors ----------
// :where() adds no specificity, so each light rule weighs exactly what its dark original
// weighs and wins only by coming later. Root token blocks keep a real selector to beat :root.
const T = '[data-theme="light"]';
const W = `:where(html${T})`;
function scope(sel) {
  return sel.split(",").map((s) => {
    s = s.trim();
    if (s === ":root" || s === "html") return `html${T}`;
    if (s.startsWith(":root")) return `html${T}` + s.slice(5);
    if (/^html\b/.test(s)) return `html${T}` + s.slice(4);
    return `${W} ${s}`;
  }).join(",");
}

// ---------- build ----------
for (const { sources, out: OUT } of JOBS) {
const out = postcss.root();
out.append(postcss.comment({ text: " Generated by scripts/make-light-css.mjs. Do not edit by hand. " }));
let decls = 0;
for (const file of sources) {
  const root = postcss.parse(fs.readFileSync(path.join(ROOT, file), "utf8"), { from: file });
  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes/i.test(rule.parent.name)) return;
    const changed = [];
    rule.each((d) => {
      if (d.type !== "decl") return;
      if (d.prop === "color-scheme") { changed.push(d.clone({ value: "light" })); return; }
      const v = mapValue(d.value);
      if (v) changed.push(d.clone({ value: v }));
    });
    if (!changed.length) return;
    // A "background" shorthand resets clip and size; carry those longhands along so
    // gradient text (background-clip:text) and sized backgrounds keep working.
    if (changed.some((d) => d.prop === "background")) {
      rule.each((d) => { if (d.type === "decl" && /^(-webkit-)?(background-(clip|size|position|repeat|origin)|text-fill-color)$/.test(d.prop) && !changed.some((c) => c.prop === d.prop)) changed.push(d.clone()); });
    }
    decls += changed.length;
    const nr = postcss.rule({ selector: scope(rule.selector) });
    changed.forEach((d) => nr.append(d));
    let node = nr, p = rule.parent;
    while (p && p.type === "atrule") { const at = postcss.atRule({ name: p.name, params: p.params }); at.append(node); node = at; p = p.parent; }
    out.append(node);
  });
}
fs.writeFileSync(path.join(ROOT, OUT), out.toString() + "\n");
console.log(`light theme: ${decls} declarations -> ${OUT}`);
}

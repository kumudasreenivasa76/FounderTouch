import type { Profile } from "@prisma/client";
import { byline, themeOf, readable } from "@/lib/look";
import { SOCIALS, parseSocials, socialUrl } from "@/lib/socials";

export const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The six signature designs. Each is plain table HTML with inline styles, so it survives Gmail, Outlook and Apple Mail. */
export const SIG_STYLES = [
  { key: "classic", name: "Classic", hint: "Accent bar and clean lines" },
  { key: "portrait", name: "Portrait", hint: "Your photo beside your details" },
  { key: "banner", name: "Banner", hint: "A band of your brand colour" },
  { key: "button", name: "Button", hint: "Ends with a clear button" },
  { key: "scan", name: "Scan me", hint: "Your QR code on the right" },
  { key: "minimal", name: "Minimal", hint: "One quiet line" },
] as const;
export type SigStyle = (typeof SIG_STYLES)[number]["key"];

export type SigOpts = {
  style: SigStyle;
  mode: string;       // which page the signature links to
  photo: boolean;
  logo: boolean;
  phone: boolean;
  website: boolean;
  socials: boolean;
  cta: boolean;
  ctaLabel: string;
  disclaimer: string;
};
export const SIG_DEFAULTS: SigOpts = { style: "classic", mode: "ALL", photo: true, logo: false, phone: true, website: true, socials: true, cta: true, ctaLabel: "View my digital card", disclaimer: "" };

export function parseSigPrefs(raw: string | null | undefined): SigOpts {
  let o: Partial<SigOpts> = {};
  try { o = JSON.parse(raw || "{}") ?? {}; } catch { o = {}; }
  const b = (k: keyof SigOpts) => (typeof o[k] === "boolean" ? (o[k] as boolean) : (SIG_DEFAULTS[k] as boolean));
  return {
    style: SIG_STYLES.some((s) => s.key === o.style) ? (o.style as SigStyle) : SIG_DEFAULTS.style,
    mode: typeof o.mode === "string" && /^[A-Z]{2,12}$/.test(o.mode) ? o.mode : "ALL",
    photo: b("photo"), logo: b("logo"), phone: b("phone"), website: b("website"), socials: b("socials"), cta: b("cta"),
    ctaLabel: (typeof o.ctaLabel === "string" ? o.ctaLabel : SIG_DEFAULTS.ctaLabel).slice(0, 40) || SIG_DEFAULTS.ctaLabel,
    disclaimer: (typeof o.disclaimer === "string" ? o.disclaimer : "").slice(0, 600),
  };
}

export type SigData = {
  name: string; headline: string; company: string; phone: string; email: string; website: string;
  photo: string;   // absolute image URL, or ""
  logo: string;    // absolute image URL, or ""
  socials: { label: string; url: string }[];
  from: string; to: string;  // brand colours
  cardUrl: string;           // where the signature links
  qrUrl: string;             // absolute URL of a QR image for cardUrl
  banner: string;            // ready-made team banner HTML, or ""
};

/** Everything a signature needs from a profile. `origin` makes image and card links absolute, as email needs. */
export function sigData(profile: Profile, origin: string, cardUrl: string, banner = "", mode = "ALL"): SigData {
  const t = themeOf(profile.theme);
  const soc = parseSocials(profile.socials);
  return {
    name: profile.name, headline: profile.headline, company: profile.company, phone: profile.phone, email: profile.email, website: profile.website,
    photo: profile.photo ? `${origin}/photo/${profile.handle}` : "",
    logo: profile.logo ? `${origin}/logo/${profile.handle}` : "",
    socials: SOCIALS.filter((s) => soc[s.key]).map((s) => ({ label: s.label.replace(/ \(.*\)$/, ""), url: socialUrl(s.key, soc[s.key]!) })),
    from: t.from, to: t.to, cardUrl, qrUrl: `${origin}/card/${profile.handle}/qr?mode=${mode}`, banner,
  };
}

const FONT = "font-family:Arial,Helvetica,sans-serif";
const INK = "#1c2330", SUB = "#566074";
const web = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
const bare = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

/** One email signature as inline-styled HTML. Pure, so the studio can redraw it in the browser as options change. */
export function renderSignature(d: SigData, o: SigOpts): string {
  const link = readable(d.from);
  const sub = byline(d.headline, d.company);
  const a = (href: string, text: string, color = link) => `<a href="${escHtml(href)}" style="color:${color};text-decoration:none">${escHtml(text)}</a>`;
  const contact = [
    o.phone && d.phone && a(`tel:${d.phone.replace(/[^\d+]/g, "")}`, d.phone, INK),
    d.email && a(`mailto:${d.email}`, d.email),
    o.website && d.website && a(web(d.website), bare(d.website)),
  ].filter(Boolean) as string[];
  const social = o.socials && d.socials.length ? d.socials.map((s) => a(s.url, s.label)).join(`<span style="color:#c3c9d6"> &nbsp;|&nbsp; </span>`) : "";
  const cta = o.cta ? `<a href="${escHtml(d.cardUrl)}" style="display:inline-block;background:${d.from};color:#ffffff;text-decoration:none;font-weight:bold;font-size:12px;line-height:1;padding:9px 16px;border-radius:999px">${escHtml(o.ctaLabel)}</a>` : "";
  const textCta = o.cta ? a(d.cardUrl, o.ctaLabel + " →") : "";
  const photo = (size: number) => (o.photo && d.photo ? `<img src="${escHtml(d.photo)}" width="${size}" height="${size}" alt="${escHtml(d.name)}" style="display:block;width:${size}px;height:${size}px;border-radius:50%;border:0">` : "");
  const logo = o.logo && d.logo ? `<img src="${escHtml(d.logo)}" height="28" alt="${escHtml(d.company || "Logo")}" style="display:block;height:28px;width:auto;border:0;margin-top:10px">` : "";
  const nameRow = (size = 16) => `<div style="font-size:${size}px;font-weight:bold;color:${INK};line-height:1.25">${escHtml(d.name)}</div>`;
  const subRow = sub ? `<div style="font-size:13px;color:${SUB};line-height:1.4">${escHtml(sub)}</div>` : "";
  const row = (html: string, top = 6) => (html ? `<div style="margin-top:${top}px;font-size:13px;line-height:1.5">${html}</div>` : "");
  const dot = `<span style="color:#c3c9d6"> &nbsp;&middot;&nbsp; </span>`;
  const table = (cells: string) => `<table cellpadding="0" cellspacing="0" border="0" style="${FONT};font-size:13px;color:${INK};border-collapse:collapse"><tr>${cells}</tr></table>`;

  let body = "";
  if (o.style === "portrait") {
    const ph = photo(72);
    body = table(`${ph ? `<td valign="top" style="padding-right:14px">${ph}</td>` : ""}<td valign="top" style="${ph ? `border-left:1px solid #e3e6ec;padding-left:14px` : ""}">${nameRow(17)}${subRow}${row(contact.join(dot))}${row(social, 4)}${row(textCta, 8)}${logo}</td>`);
  } else if (o.style === "banner") {
    const ph = photo(44);
    body = `<table cellpadding="0" cellspacing="0" border="0" style="${FONT};font-size:13px;color:${INK};border-collapse:collapse;min-width:320px"><tr><td style="background:${d.from};background-image:linear-gradient(135deg,${d.from},${d.to});padding:12px 16px;border-radius:10px 10px 0 0"><table cellpadding="0" cellspacing="0" border="0"><tr>${ph ? `<td style="padding-right:12px">${ph}</td>` : ""}<td><div style="font-size:17px;font-weight:bold;color:#ffffff;line-height:1.25">${escHtml(d.name)}</div>${sub ? `<div style="font-size:13px;color:#ffffff;opacity:.92">${escHtml(sub)}</div>` : ""}</td></tr></table></td></tr><tr><td style="padding:12px 16px;border:1px solid #e3e6ec;border-top:0;border-radius:0 0 10px 10px">${row(contact.join(dot), 0)}${row(social, 4)}${row(textCta, 8)}${logo}</td></tr></table>`;
  } else if (o.style === "button") {
    const ph = photo(56);
    body = table(`${ph ? `<td valign="top" style="padding-right:14px">${ph}</td>` : ""}<td valign="top">${nameRow(18)}${sub ? `<div style="font-size:13px;font-weight:bold;color:${link};line-height:1.4">${escHtml(sub)}</div>` : ""}${row(contact.join(dot), 8)}${row(social, 4)}${cta ? `<div style="margin-top:12px">${cta}</div>` : ""}${logo}</td>`);
  } else if (o.style === "scan") {
    body = table(`<td valign="top" style="padding-right:18px">${nameRow(17)}${subRow}${row(contact.join("<br>"))}${row(social, 4)}${row(textCta, 8)}${logo}</td><td valign="top" style="border-left:1px solid #e3e6ec;padding-left:18px;text-align:center"><a href="${escHtml(d.cardUrl)}"><img src="${escHtml(d.qrUrl)}" width="84" height="84" alt="QR code for ${escHtml(d.name)}'s card" style="display:block;width:84px;height:84px;border:0"></a><div style="font-size:10px;color:${SUB};margin-top:4px">Scan to save</div></td>`);
  } else if (o.style === "minimal") {
    body = `<div style="${FONT};font-size:13px;color:${INK};line-height:1.6"><b>${escHtml(d.name)}</b>${sub ? `${dot}<span style="color:${SUB}">${escHtml(sub)}</span>` : ""}<br>${[...contact, textCta].filter(Boolean).join(dot)}${social ? `<br>${social}` : ""}</div>`;
  } else {
    body = table(`<td style="border-left:4px solid ${d.from};padding-left:12px">${nameRow()}${subRow}${row(contact.join(dot))}${row(social, 4)}${row(textCta)}${logo}</td>`);
  }
  const disclaimer = o.disclaimer.trim() ? `<div style="${FONT};margin-top:12px;max-width:520px;font-size:10px;line-height:1.45;color:#8a93a6">${escHtml(o.disclaimer.trim()).replace(/\n/g, "<br>")}</div>` : "";
  return `<div>${body}${d.banner ? `<div style="${FONT};font-size:13px">${d.banner}</div>` : ""}${disclaimer}</div>`;
}

/** The signature with the owner's saved design and options. Used wherever a ready signature is shown. */
export function buildSignature(profile: Profile & { sigPrefs?: string }, url: string, banner = "", origin = ""): string {
  const prefs = parseSigPrefs(profile.sigPrefs);
  const base = origin || url.replace(/^(https?:\/\/[^/]+).*$/, "$1");
  return renderSignature(sigData(profile, base, url, banner, prefs.mode), prefs);
}

/** The organization's campaign banner line, if one is set. */
export function buildBanner(org: { bannerText: string; bannerUrl: string } | null | undefined, theme: string): string {
  if (!org?.bannerText) return "";
  const rc = readable(themeOf(theme).from);
  return `<div style="margin-top:8px;padding:6px 0;border-top:1px solid #e3e6ec">${org.bannerUrl ? `<a href="${escHtml(org.bannerUrl)}" style="color:${rc}">${escHtml(org.bannerText)}</a>` : escHtml(org.bannerText)}</div>`;
}

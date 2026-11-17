import { db } from "@/lib/db";
import { MODES, MODE_INFO, Mode, modePath } from "@/lib/modes";
import { modeHasContent } from "@/lib/mode-content";

/** Ready-made looks for the link page. Each key matches a `.lt-t-<key>` rule in globals.css. */
export const LINK_THEMES = [
  { key: "lilac", name: "Lilac", swatch: "linear-gradient(160deg,#efe6ff,#faf7ff)", dot: "#7c3aed" },
  { key: "aurora", name: "Aurora", swatch: "linear-gradient(160deg,#7c3aed,#c084fc 55%,#f0abfc)", dot: "#ffffff" },
  { key: "midnight", name: "Midnight", swatch: "linear-gradient(160deg,#1a1338,#3b2a7a)", dot: "#c4b5fd" },
  { key: "blush", name: "Blush", swatch: "linear-gradient(160deg,#ffe4ef,#f3e8ff)", dot: "#db2777" },
  { key: "mint", name: "Mint", swatch: "linear-gradient(160deg,#dcfce7,#ecfeff)", dot: "#0f766e" },
  { key: "paper", name: "Paper", swatch: "linear-gradient(160deg,#ffffff,#f4f4f5)", dot: "#18181b" },
] as const;
export type LinkTheme = (typeof LINK_THEMES)[number]["key"];
export const linkTheme = (k: string | null | undefined): LinkTheme => (LINK_THEMES.some((t) => t.key === k) ? (k as LinkTheme) : "lilac");

export const hiddenAuto = (raw: string | null | undefined) => new Set((raw ?? "").split(",").filter(Boolean));
export const normUrl = (u: string) => u.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
export const shortUrl = (u: string) => u.replace(/^(https?:\/\/(www\.)?|mailto:|tel:)/i, "").replace(/\/$/, "");

/** Picks an icon for a link from its address: a brand glyph for known sites, otherwise a line icon. */
export function linkIcon(url: string): { social?: string; icon?: string } {
  const u = url.toLowerCase();
  if (u.startsWith("mailto:")) return { icon: "mail" };
  if (u.startsWith("tel:")) return { icon: "phone" };
  let host = "";
  try { host = new URL(u).hostname.replace(/^www\./, ""); } catch { return { icon: "link" }; }
  const is = (...d: string[]) => d.some((x) => host === x || host.endsWith("." + x));
  if (is("linkedin.com")) return { social: "linkedin" };
  if (is("x.com", "twitter.com")) return { social: "x" };
  if (is("instagram.com")) return { social: "instagram" };
  if (is("github.com")) return { social: "github" };
  if (is("youtube.com", "youtu.be")) return { social: "youtube" };
  if (is("facebook.com", "fb.com")) return { social: "facebook" };
  if (is("t.me", "telegram.me")) return { social: "telegram" };
  if (is("wa.me", "whatsapp.com")) return { social: "whatsapp" };
  if (is("calendly.com", "cal.com", "calendar.google.com", "calendar.app.google")) return { icon: "calendar" };
  if (is("vimeo.com", "loom.com")) return { icon: "play" };
  if (is("docs.google.com", "drive.google.com", "notion.so", "notion.site", "dropbox.com")) return { icon: "file" };
  return { icon: "link" };
}

export type AutoLink = { key: string; title: string; href: string; icon?: string; mode?: Mode; external: boolean; sub: string };

/** What a profile puts on its link page without the owner adding anything: its booking link, website and pages. */
export async function autoLinks(profileId: string, handle: string): Promise<AutoLink[]> {
  const p = await db.profile.findUnique({
    where: { id: profileId },
    include: {
      modes: true,
      resources: { select: { modes: true } },
      projects: { select: { modes: true, eventId: true } },
      _count: { select: { events: true, career: true, jobs: { where: { open: true } } } },
    },
  });
  if (!p) return [];
  const extra = {
    projects: p.projects.filter((x) => !x.eventId).length,
    events: p._count.events,
    jobs: p._count.jobs,
    career: p._count.career + (p.skills.trim() || p.openTo ? 1 : 0),
    projectModes: p.projects.flatMap((x) => x.modes.split(",").filter(Boolean)),
  };
  const out: AutoLink[] = [];
  const all = p.modes.find((c) => c.mode === "ALL");
  if (all?.bookingUrl && /^https?:\/\//i.test(all.bookingUrl)) out.push({ key: "book", title: all.ctaLabel || "Book a meeting", href: all.bookingUrl, icon: "calendar", external: true, sub: shortUrl(all.bookingUrl) });
  if (p.website) {
    const href = /^https?:\/\//i.test(p.website) ? p.website : `https://${p.website}`;
    out.push({ key: "web", title: p.company ? `${p.company} website` : "Website", href, icon: "globe", external: true, sub: shortUrl(href) });
  }
  for (const m of MODES) {
    if (m === "ALL") continue;
    const cfg = p.modes.find((c) => c.mode === m);
    if (!cfg?.isEnabled || !modeHasContent(m, cfg, p.resources, extra)) continue;
    out.push({ key: m, title: `${MODE_INFO[m].label} page`, href: modePath(handle, m), mode: m, external: false, sub: MODE_INFO[m].blurb });
  }
  return out;
}

/** Page title, description and search-engine rule for a person's public pages. */
export async function profileMeta(handle: string, suffix = "") {
  const p = await db.profile.findUnique({ where: { handle }, select: { name: true, headline: true, searchable: true } });
  if (!p) return { title: "Not found" };
  return {
    title: suffix ? `${p.name} · ${suffix}` : p.name,
    description: p.headline || `${p.name} on TapNodd.`,
    ...(p.searchable ? {} : { robots: { index: false, follow: false } }),
  };
}

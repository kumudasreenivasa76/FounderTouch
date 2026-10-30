export const SOCIALS = [
  { key: "linkedin", label: "LinkedIn", icon: "in", base: "https://linkedin.com/in/", ph: "linkedin.com/in/you" },
  { key: "x", label: "X (Twitter)", icon: "𝕏", base: "https://x.com/", ph: "@you" },
  { key: "instagram", label: "Instagram", icon: "◎", base: "https://instagram.com/", ph: "@you" },
  { key: "github", label: "GitHub", icon: "⌘", base: "https://github.com/", ph: "github.com/you" },
  { key: "youtube", label: "YouTube", icon: "▶", base: "https://youtube.com/@", ph: "youtube.com/@you" },
  { key: "facebook", label: "Facebook", icon: "f", base: "https://facebook.com/", ph: "facebook.com/you" },
  { key: "telegram", label: "Telegram", icon: "✈", base: "https://t.me/", ph: "@you" },
  { key: "portfolio", label: "Portfolio", icon: "🗂", base: "https://", ph: "yourportfolio.com" },
  { key: "whatsapp", label: "WhatsApp", icon: "✆", base: "https://wa.me/", ph: "+91 98765 43210" },
] as const;

export type Socials = Partial<Record<(typeof SOCIALS)[number]["key"], string>>;

/** Accepts a full URL, a bare "site.com/you" or just a handle, and returns a clean https URL ("" if empty). */
export function socialUrl(key: string, raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  const s = SOCIALS.find((x) => x.key === key);
  if (!s) return "";
  if (key === "whatsapp") {
    if (/^https?:\/\//i.test(v)) return v;
    const digits = v.replace(/\D/g, "");
    return digits ? s.base + digits : "";
  }
  if (key === "portfolio") return /^https?:\/\//i.test(v) ? v : "https://" + v.replace(/^\/+/, "");
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?[a-z0-9-]+\.[a-z]{2,}\//i.test(v)) return "https://" + v.replace(/^www\./i, "");
  const handle = v.replace(/^@/, "").replace(/[^\w.\-]/g, "");
  return handle ? s.base + handle : "";
}

export function parseSocials(s: string): Socials {
  try { return JSON.parse(s) ?? {}; } catch { return {}; }
}

/** Build a cleaned JSON string from form fields named `social_<key>`. */
export function socialsFromForm(fd: FormData): string {
  const out: Socials = {};
  for (const s of SOCIALS) {
    const u = socialUrl(s.key, String(fd.get("social_" + s.key) ?? ""));
    if (u) out[s.key] = u;
  }
  return JSON.stringify(out);
}

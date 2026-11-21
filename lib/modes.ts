/**
 * The modes (who you are when you share). Each mode asks for only what it needs:
 * its own fields and only the kinds of files that make sense for it.
 */
export const MODES = ["NORMAL", "FOUNDER", "INVESTOR", "SERVICES", "RECRUITER", "OTHER", "ALL"] as const;
export type Mode = (typeof MODES)[number];

export type Kind = "DECK" | "DEMO" | "RESUME" | "PORTFOLIO" | "DOC" | "SUPPORT";
export type FieldType = "text" | "textarea" | "list" | "url" | "select";
export type Field = { key: string; label: string; type: FieldType; hint?: string; options?: string[] };

type Info = {
  label: string; icon: string; blurb: string; cta: string;
  intro?: string;
  kit: string;         // name of this mode's kit
  about: string;       // heading of the main description
  aboutHint: string;   // placeholder for the main description
  pane: string;        // tab name on the public page
  kinds: Partial<Record<Kind, string>>; // file types this mode uses, with this mode's names for them
  fields: Field[];     // extra details specific to this mode (all optional)
};

export const MODE_INFO: Record<Mode, Info> = {
  FOUNDER: {
    label: "Founder", icon: "", blurb: "I run a startup", cta: "Let's connect",
    intro: "Everything investors, partners and future hires need to back you. Add only what fits.",
    kit: "Founder", about: "What we do", aboutHint: "What your product does, in one or two lines", pane: "Startup",
    kinds: { RESUME: "Resume / CV", PORTFOLIO: "Portfolio", DECK: "Pitch deck", DEMO: "Product demo", DOC: "2-pager", SUPPORT: "Other documents" },
    fields: [
      { key: "stage", label: "Stage", type: "select", options: ["Idea", "Pre-seed", "Seed", "Series A", "Series B+", "Bootstrapped", "Profitable"] },
      { key: "traction", label: "Traction", type: "textarea", hint: "Revenue, users, growth, notable customers" },
      { key: "lookingFor", label: "Looking for", type: "list", hint: "e.g. investors, hires, customers, partners" },
      { key: "raising", label: "Raising", type: "text", hint: "e.g. $1.2M to $3M" },
      { key: "round", label: "Round", type: "select", options: ["Pre-seed", "Seed", "Series A", "Series B", "Bridge", "Not raising"] },
      { key: "useOfFunds", label: "Use of funds", type: "textarea", hint: "Where the money goes" },
      { key: "users", label: "Users or customers", type: "text", hint: "e.g. 12,000 users or 14 paying plants" },
      { key: "revenue", label: "Revenue", type: "text", hint: "e.g. $38k MRR" },
      { key: "milestones", label: "Milestones", type: "list", hint: "One per line, e.g. MVP launched" },
    ],
  },
  INVESTOR: {
    label: "Investor", icon: "", blurb: "I invest in startups", cta: "Pitch me",
    kit: "Investor kit", about: "Investment thesis", aboutHint: "What you look for in a founder and a company", pane: "Portfolio",
    kinds: { RESUME: "Resume / CV", PORTFOLIO: "Portfolio document", DECK: "Fund deck", DOC: "Thesis & one-pager", SUPPORT: "Other documents" },
    fields: [
      { key: "type", label: "Investor type", type: "select", options: ["Angel", "VC", "Family office", "Corporate VC", "Accelerator / studio", "Syndicate"] },
      { key: "firm", label: "Firm / fund", type: "text", hint: "e.g. Orbit Ventures" },
      { key: "focus", label: "Sectors I invest in", type: "list", hint: "e.g. fintech, climate, AI" },
      { key: "stages", label: "Stages", type: "list", hint: "e.g. pre-seed, seed" },
      { key: "ticket", label: "Typical cheque size", type: "text", hint: "e.g. $25k to $250k" },
      { key: "geography", label: "Geography", type: "text", hint: "e.g. India, Southeast Asia" },
      { key: "portfolio", label: "Portfolio companies", type: "list", hint: "Companies you have invested in, one per line" },
      { key: "portfolioUrl", label: "Portfolio link", type: "url", hint: "Your portfolio page, AngelList, Crunchbase…" },
      { key: "howToPitch", label: "How to pitch me", type: "textarea", hint: "What to send and what you respond to" },
    ],
  },
  SERVICES: {
    label: "Seller", icon: "", blurb: "I sell products or services", cta: "Get a quote",
    kit: "Seller kit", about: "What we offer", aboutHint: "Your products or services and who they are for", pane: "Offerings",
    kinds: { RESUME: "Resume / CV", PORTFOLIO: "Portfolio & clients", DECK: "Company profile", DEMO: "Product or work video", DOC: "Catalog, rate card or brochure", SUPPORT: "Case studies & other documents" },
    fields: [
      { key: "industry", label: "Industry", type: "text" },
      { key: "services", label: "Products & services", type: "list", hint: "One per line, e.g. Brand design, Handmade soaps" },
      { key: "rate", label: "Pricing", type: "text", hint: "e.g. From ₹40,000 per project, or ₹500 to ₹5,000 per unit" },
      { key: "minOrder", label: "Minimum order", type: "text", hint: "e.g. 5 units (for products)" },
      { key: "delivery", label: "Delivery & areas", type: "text", hint: "e.g. Ships in 7 days, pan-India" },
      { key: "availability", label: "Availability", type: "text", hint: "e.g. Taking new clients from December" },
      { key: "portfolioUrl", label: "Portfolio, catalog or store link", type: "url" },
      { key: "clients", label: "Selected clients", type: "list" },
      { key: "partnerships", label: "Partnerships we want", type: "textarea" },
    ],
  },
  NORMAL: {
    label: "Normal", icon: "", blurb: "Just me, a personal profile", cta: "Get in touch",
    intro: "A simple personal card: your photo, a few words about you, and how to reach you.",
    kit: "Normal profile", about: "About me", aboutHint: "A few lines about you", pane: "Profile",
    kinds: {},
    fields: [],
  },
  RECRUITER: {
    label: "Recruiter", icon: "", blurb: "I hire talent", cta: "See open roles",
    kit: "Recruiter kit", about: "Why join us", aboutHint: "What it is like to work with your company", pane: "Hiring",
    kinds: { DECK: "Company deck", DOC: "Job descriptions", SUPPORT: "Other documents" },
    fields: [
      { key: "workType", label: "Work type", type: "select", options: ["On-site", "Hybrid", "Remote"] },
      { key: "locations", label: "Locations", type: "text", hint: "e.g. Bengaluru, Remote (India)" },
      { key: "perks", label: "Perks & benefits", type: "list" },
      { key: "process", label: "Hiring process", type: "textarea", hint: "Steps and how long it takes" },
      { key: "applyUrl", label: "Careers or apply link", type: "url" },
    ],
  },
  OTHER: {
    label: "Other", icon: "", blurb: "Something else", cta: "Get in touch",
    kit: "My kit", about: "About", aboutHint: "What this page is for", pane: "About",
    kinds: { DECK: "Slides", DEMO: "Videos", RESUME: "Resume / CV", PORTFOLIO: "Portfolio", DOC: "Documents", SUPPORT: "Other documents" },
    fields: [
      { key: "title", label: "Page title", type: "text", hint: "e.g. Speaker, Student, Artist, Volunteer" },
      { key: "links", label: "Useful links", type: "list", hint: "One link per line" },
      { key: "url", label: "Main link", type: "url" },
    ],
  },
  ALL: {
    label: "All", icon: "", blurb: "Let visitors pick", cta: "Book a meeting",
    kit: "Everything", about: "About", aboutHint: "A short overview", pane: "Overview",
    kinds: { RESUME: "Resume / CV", PORTFOLIO: "Portfolio", DECK: "Decks", DEMO: "Demos", DOC: "Documents", SUPPORT: "Supporting documents" },
    fields: [],
  },
};

export const KIND_ORDER: Kind[] = ["DECK", "DEMO", "RESUME", "PORTFOLIO", "DOC", "SUPPORT"];
/** The names of the file types a mode uses, in display order. */
export const kindsOf = (mode: string) => KIND_ORDER.filter((k) => MODE_INFO[mode as Mode]?.kinds[k]);
export const kindLabel = (mode: string, kind: string) => MODE_INFO[mode as Mode]?.kinds[kind as Kind] ?? MODE_INFO.ALL.kinds[kind as Kind] ?? kind;

export const parseFields = (s: string): Record<string, string> => { try { return JSON.parse(s) ?? {}; } catch { return {}; } };
/** "a, b\nc" -> ["a","b","c"] */
export const listItems = (v: string) => v.split(/[\n,;]/).map((x) => x.trim()).filter(Boolean);

/** Extra buttons a mode shows under its main button. Stored as JSON on ModeConfig.links. */
export type ModeLink = { label: string; url: string };
export const MAX_MODE_LINKS = 5;
export function parseLinks(raw: string | null | undefined): ModeLink[] {
  try {
    const a = JSON.parse(raw || "[]");
    if (!Array.isArray(a)) return [];
    return a
      .filter((x) => x && typeof x.label === "string" && typeof x.url === "string" && /^(https?:\/\/|mailto:|tel:)/i.test(x.url))
      .slice(0, MAX_MODE_LINKS)
      .map((x) => ({ label: x.label, url: x.url }));
  } catch {
    return [];
  }
}
/** Turns what someone typed into a safe link: bare domains get https://, emails become mailto:, anything else is dropped. */
export function cleanLink(v: string): string {
  const t = v.trim();
  if (!t) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(t)) return t;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "mailto:" + t;
  if (/^\+?[\d\s().-]{7,}$/.test(t)) return "tel:" + t.replace(/[^\d+]/g, "");
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return "https://" + t;
  return "";
}

/** The word each page uses in its short address: /handle/founder, /handle/business, /handle/card (the full profile). */
const MODE_SLUGS: Record<Mode, string> = { FOUNDER: "founder", INVESTOR: "investor", SERVICES: "business", NORMAL: "me", RECRUITER: "recruiter", OTHER: "other", ALL: "card" };
export const modeSlug = (m: string) => MODE_SLUGS[m as Mode] ?? m.toLowerCase();
export const modeFromSlug = (slug: string): Mode | null => slug.toLowerCase() === "hire" ? "NORMAL" : (Object.keys(MODE_SLUGS) as Mode[]).find((m) => MODE_SLUGS[m] === slug.toLowerCase()) ?? null; // old Hire me links open the Normal page
export const modePath = (handle: string, m: string) => `/${handle}/${modeSlug(m)}`;

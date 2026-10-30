/**
 * The modes (who you are when you share). Each mode asks for only what it needs:
 * its own fields and only the kinds of files that make sense for it.
 */
export const MODES = ["FOUNDER", "INVESTOR", "SELLER", "SERVICES", "HIRE", "RECRUITER", "HACKATHON", "BUSINESS", "OTHER", "ALL"] as const;
export type Mode = (typeof MODES)[number];

export type Kind = "DECK" | "DEMO" | "RESUME" | "PORTFOLIO" | "DOC" | "SUPPORT";
export type FieldType = "text" | "textarea" | "list" | "url" | "select";
export type Field = { key: string; label: string; type: FieldType; hint?: string; options?: string[] };

type Info = {
  label: string; icon: string; blurb: string; cta: string;
  kit: string;         // name of this mode's kit
  about: string;       // heading of the main description
  aboutHint: string;   // placeholder for the main description
  pane: string;        // tab name on the public page
  kinds: Partial<Record<Kind, string>>; // file types this mode uses, with this mode's names for them
  fields: Field[];     // extra details specific to this mode (all optional)
};

export const MODE_INFO: Record<Mode, Info> = {
  FOUNDER: {
    label: "Founder", icon: "🚀", blurb: "I run a startup", cta: "Let's connect",
    kit: "Founder kit", about: "What we do", aboutHint: "What your product does, in one or two lines", pane: "Startup",
    kinds: { RESUME: "Resume / CV", PORTFOLIO: "Portfolio", DECK: "Pitch deck", DEMO: "Product demo", DOC: "2-pager", SUPPORT: "Other documents" },
    fields: [
      { key: "stage", label: "Stage", type: "select", options: ["Idea", "Pre-seed", "Seed", "Series A", "Series B+", "Bootstrapped", "Profitable"] },
      { key: "traction", label: "Traction", type: "textarea", hint: "Revenue, users, growth, notable customers" },
      { key: "lookingFor", label: "Looking for", type: "list", hint: "e.g. investors, hires, customers, partners" },
    ],
  },
  INVESTOR: {
    label: "Investor", icon: "💼", blurb: "I invest in startups", cta: "Pitch me",
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
  SELLER: {
    label: "Seller", icon: "🛍️", blurb: "I sell products", cta: "Request a quote",
    kit: "Seller kit", about: "What I sell", aboutHint: "Your products and who they are for", pane: "Products",
    kinds: { RESUME: "Resume / CV", PORTFOLIO: "Product portfolio", DEMO: "Product video", DOC: "Catalog / price list", SUPPORT: "Certificates & other documents" },
    fields: [
      { key: "priceRange", label: "Price range", type: "text", hint: "e.g. ₹500 to ₹5,000" },
      { key: "minOrder", label: "Minimum order", type: "text", hint: "e.g. 5 units" },
      { key: "delivery", label: "Delivery & areas", type: "text", hint: "e.g. Ships in 7 days, pan-India" },
      { key: "payment", label: "Payment terms", type: "text" },
      { key: "catalogUrl", label: "Catalog or store link", type: "url" },
    ],
  },
  SERVICES: {
    label: "Service Provider", icon: "🛠️", blurb: "I offer services", cta: "Book a consultation",
    kit: "Service Provider kit", about: "What I offer", aboutHint: "Who you help and how", pane: "Services",
    kinds: { RESUME: "Resume / CV", PORTFOLIO: "Portfolio", DEMO: "Work sample video", DOC: "Brochure / rate card", SUPPORT: "Case studies & other documents" },
    fields: [
      { key: "services", label: "Services offered", type: "list", hint: "One per line, e.g. Brand design" },
      { key: "rate", label: "Pricing", type: "text", hint: "e.g. From ₹40,000 per project" },
      { key: "availability", label: "Availability", type: "text", hint: "e.g. Taking new clients from December" },
      { key: "portfolioUrl", label: "Portfolio link", type: "url", hint: "Your work, case studies or Behance/Dribbble" },
      { key: "clients", label: "Selected clients", type: "list" },
    ],
  },
  HIRE: {
    label: "Hire me", icon: "🙋", blurb: "I am looking for work", cta: "Contact me",
    kit: "Hire me page", about: "About", aboutHint: "A short summary of who you are and what you are good at", pane: "Profile",
    kinds: { RESUME: "Resume / CV", PORTFOLIO: "Portfolio files", SUPPORT: "Certificates & documents" },
    fields: [],
  },
  RECRUITER: {
    label: "Recruiter", icon: "🎯", blurb: "I hire talent", cta: "See open roles",
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
  HACKATHON: {
    label: "Hackathon", icon: "🏆", blurb: "I hack and organize events", cta: "Team up",
    kit: "Hackathon kit", about: "About me", aboutHint: "What you build and what you enjoy", pane: "Work",
    kinds: { RESUME: "Resume / CV", PORTFOLIO: "Portfolio", DECK: "Pitch slides", DEMO: "Demo video", DOC: "Write-up", SUPPORT: "Other documents" },
    fields: [
      { key: "role", label: "I am a", type: "select", options: ["Participant", "Organizer", "Mentor", "Judge", "Sponsor"] },
      { key: "skills", label: "Skills & stack", type: "list", hint: "e.g. React, Python, ML" },
      { key: "team", label: "Looking for a team?", type: "select", options: ["Yes", "Maybe", "No"] },
      { key: "wins", label: "Past hackathons & wins", type: "textarea" },
    ],
  },
  BUSINESS: {
    label: "Business", icon: "🤝", blurb: "I represent a company", cta: "Explore a partnership",
    kit: "Business kit", about: "What we offer", aboutHint: "What your company does and who it serves", pane: "Company",
    kinds: { RESUME: "Resume / CV", PORTFOLIO: "Client portfolio", DECK: "Company profile", DOC: "Capability statement", SUPPORT: "Other documents" },
    fields: [
      { key: "industry", label: "Industry", type: "text" },
      { key: "size", label: "Company size", type: "select", options: ["1 to 10", "11 to 50", "51 to 200", "201 to 1,000", "1,000+"] },
      { key: "offers", label: "Products & services", type: "list" },
      { key: "partnerships", label: "Partnerships we want", type: "textarea" },
    ],
  },
  OTHER: {
    label: "Other", icon: "📌", blurb: "Something else", cta: "Get in touch",
    kit: "My kit", about: "About", aboutHint: "What this page is for", pane: "About",
    kinds: { DECK: "Slides", DEMO: "Videos", RESUME: "Resume / CV", PORTFOLIO: "Portfolio", DOC: "Documents", SUPPORT: "Other documents" },
    fields: [
      { key: "title", label: "Page title", type: "text", hint: "e.g. Speaker, Student, Artist, Volunteer" },
      { key: "links", label: "Useful links", type: "list", hint: "One link per line" },
      { key: "url", label: "Main link", type: "url" },
    ],
  },
  ALL: {
    label: "All", icon: "✨", blurb: "Let visitors pick", cta: "Book a meeting",
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

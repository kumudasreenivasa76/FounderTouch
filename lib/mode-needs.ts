import { parseFields, type Mode } from "./modes";
import { parseSocials } from "./socials";

export type Need = { ok: boolean; label: string; href: string };
export type NeedData = {
  headline: string; bio: string; about: string; company: string; website: string; phone: string; email: string;
  socials: number; team: number; decks: number; demos: number; docs: number; projects: number; events: number;
  booking: boolean; hasPortfolio: boolean; jobs: number; career: number; skills: boolean; resume: boolean;
  f: Record<string, string>; // this mode's extra fields
};

const P = "/app/profile";
/** The few things a visitor of this mode expects to find. Each links to where you add it. */
export function modeNeeds(mode: Mode, d: NeedData): Need[] {
  const kit = (extra = "") => `${P}/kit?mode=${mode}${extra}`;
  const has = (k: string) => !!d.f[k]?.trim();
  const book: Need = { ok: d.booking, label: "Add a booking link", href: "/app" };
  const contact: Need = { ok: !!(d.phone || d.email), label: "Add a phone or email", href: `${P}/contact` };
  const about = (label: string): Need => ({ ok: !!d.about, label, href: kit() });
  switch (mode) {
    case "FOUNDER":
      return [about("Describe what you do"), { ok: d.decks > 0, label: "Add a pitch deck", href: kit("&kind=DECK#add") }, { ok: d.demos > 0, label: "Add a product demo", href: kit("&kind=DEMO#add") }, { ok: d.team > 0, label: "Add your team", href: `${P}/company` }];
    case "INVESTOR":
      return [about("Write your investment thesis"), { ok: has("focus") || has("stages"), label: "Add sectors and stages you invest in", href: kit() }, { ok: has("portfolio") || has("portfolioUrl"), label: "Add your portfolio or portfolio link", href: kit() }, book];
    case "SELLER":
      return [about("List what you sell"), { ok: d.docs > 0 || has("catalogUrl"), label: "Add a catalog or store link", href: kit("&kind=DOC#add") }, contact, book];
    case "SERVICES":
      return [about("Describe your services"), { ok: has("services"), label: "List the services you offer", href: kit() }, { ok: has("portfolioUrl") || d.hasPortfolio, label: "Add a portfolio link", href: kit() }, book];
    case "HACKATHON":
      return [{ ok: d.projects > 0, label: "Add a project and demo", href: `${P}/sections?tab=projects` }, { ok: has("skills"), label: "Add your skills and stack", href: kit() }, { ok: d.events > 0, label: "Create or add an event", href: `/app/events` }];
    case "BUSINESS":
      return [about("Describe what your company offers"), { ok: !!d.company, label: "Add your company name", href: `${P}/company` }, { ok: !!d.website, label: "Add your website", href: `${P}/contact` }, book];
    case "HIRE":
      return [{ ok: !!d.headline, label: "Write a headline", href: `${P}/details` }, { ok: d.career > 0, label: "Add your experience or education", href: `${P}/work` }, { ok: d.skills, label: "Add your skills", href: `${P}/work` }, { ok: d.resume, label: "Add your resume", href: `${P}/work` }];
    case "RECRUITER":
      return [about("Say why people should join you"), { ok: d.jobs > 0, label: "Post an open role", href: `${P}/jobs` }, { ok: has("perks") || has("process"), label: "Add perks or your hiring process", href: kit() }, { ok: !!d.company, label: "Add your company name", href: `${P}/company` }];
    case "OTHER":
      return [{ ok: has("title"), label: "Give the page a title", href: kit() }, about("Describe what this page is for"), { ok: has("links") || has("url"), label: "Add a link", href: kit() }];
    default:
      return [{ ok: !!d.headline, label: "Write a headline", href: `${P}/details` }, { ok: !!d.bio, label: "Write a short bio", href: `${P}/details` }, contact, { ok: d.socials > 0, label: "Add a social link", href: `${P}/contact` }];
  }
}

/** Gathers what modeNeeds() looks at, from plain values (so any screen can build the checklist). */
export function buildNeedData(a: {
  profile: { headline: string; bio: string; product: string; company: string; website: string; phone: string; email: string; socials: string };
  cfg: { kitText: string; fields: string; bookingUrl: string };
  mode: string; resources: { kind: string; modes: string }[]; team: number; projects: number; events: number; jobs?: number; career?: number; skills?: boolean;
}): NeedData {
  const { profile, cfg, mode, resources } = a;
  const soc = parseSocials(profile.socials);
  const n = (k: string) => resources.filter((r) => r.kind === k && (mode === "ALL" || r.modes.split(",").includes(mode))).length;
  return {
    headline: profile.headline, bio: profile.bio, about: cfg.kitText || (mode === "FOUNDER" ? profile.product : ""), company: profile.company, website: profile.website,
    phone: profile.phone, email: profile.email, socials: Object.values(soc).filter(Boolean).length, team: a.team,
    decks: n("DECK"), demos: n("DEMO"), docs: n("DOC") + n("SUPPORT"), projects: a.projects, events: a.events,
    booking: !!cfg.bookingUrl, hasPortfolio: !!soc.portfolio, jobs: a.jobs ?? 0, career: a.career ?? 0, skills: !!a.skills, resume: resources.some((r) => r.kind === "RESUME"), f: parseFields(cfg.fields),
  };
}
